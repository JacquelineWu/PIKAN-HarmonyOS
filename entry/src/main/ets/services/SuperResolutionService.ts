/**
 * services/SuperResolutionService.ts — 第九十九轮：Core Vision Kit 图像超分的能力封装
 *
 * 职责边界（**刻意收得很窄**）：
 *   · 只管「把 Core Vision Kit 的 ImageSRAnalyzer 用起来」：懒初始化 / 复用 / 超时 / 释放；
 *   · 不含任何业务判据（要不要超分、超到多大 → `common/SuperResPlan.ts`）；
 *   · 不含任何 UI / 状态（结果交给 Index 决定要不要上屏）；
 *   · **永不抛异常**：初始化失败、服务异常、超时，一律返回 undefined 让调用方降级。
 *
 * 官方能力：Core Vision Kit · 图像超分
 *   指南：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/core-vision-image-super-resolution
 *   声明：SDK 26.0.0 `@hms.ai.vision.imageSuperResolution.d.ts`
 *     `ImageSRAnalyzer.create(): Promise<ImageSRAnalyzer>`
 *     `process(request: visionBase.Request): Promise<ISPResponse>`（`ISPResponse.pixelMap` 是产物）
 *     `destroy(): Promise<void>`；错误码 `1018700001` = 服务异常。
 *
 * 几个容易踩的点，写在这里免得后人重踩：
 *   ① `ImageSRAnalyzer` 的构造函数是 private，只能 `create()`；`create()` 会拉起模型 / 服务，
 *      属于**重操作**，所以只在真正需要超分时才初始化（懒加载），且全局复用同一个实例。
 *   ② `process()` 的入参是 `visionBase.Request` 的**类实例**（不是字面量对象），
 *      ArkTS 下必须 `new visionBase.Request()` 再赋 `inputData`。
 *   ③ 超分是异步推理，可能几秒不返回。需求要求「处理超时降级」，所以这里用超时竞速：
 *      超时先返回 undefined（画面用原图，绝不卡住），**迟到的结果必须 release**，否则泄漏。
 *   ④ 初始化失败会在 `unavailableUntil` 内直接短路（不再重试），避免每次切图都去拉一次
 *      不存在的服务；冷却结束后允许再试（服务可能只是临时不可用）。
 */

import { image } from '@kit.ImageKit';
import { imageSuperResolution, visionBase } from '@kit.CoreVisionKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN: number = 0x1E01;
const TAG: string = 'PikanSR';

/** 初始化失败后的冷却时间：这段时间内不再尝试（服务可能临时不可用，但不必每张图都试）。 */
const SR_INIT_COOLDOWN_MS: number = 60000;

/** 一次超分调用的结果（把「有没有拿到 / 为什么没拿到」都带出来，便于调用方记日志）。 */
export interface SuperResOutcome {
  /** 成功时的产物；失败 / 超时 / 不可用时为 undefined。 */
  pixelMap: image.PixelMap | undefined;
  /** 失败原因（成功为空串）。 */
  reason: string;
  /** 调用耗时（ms，含排队与初始化）。 */
  elapsedMs: number;
}

export class SuperResolutionService {
  private analyzer: imageSuperResolution.ImageSRAnalyzer | undefined = undefined;
  /** 初始化中的那次 Promise：并发调用共享同一次 create()，不会拉起重多个实例。 */
  private initing: Promise<boolean> | undefined = undefined;
  /** 能力不可用（初始化失败）的冷却截止时刻；0 = 从没失败过。 */
  private unavailableUntil: number = 0;

  /** 是否已经在一次失败冷却里（只读给调用方做日志 / 跳过的快速判断）。 */
  available(): boolean {
    if (Date.now() < this.unavailableUntil) {
      return false;
    }
    return true;
  }

  /** 懒初始化：成功返回 true；任何异常都收敛成 false，并进入冷却。 */
  async ensureReady(): Promise<boolean> {
    if (this.analyzer !== undefined) {
      return true;
    }
    if (!this.available()) {
      return false;
    }
    if (this.initing !== undefined) {
      return this.initing;                 // 并发：等同一次初始化结果
    }
    this.initing = this.doInit();
    const ok: boolean = await this.initing;
    this.initing = undefined;
    return ok;
  }

  private async doInit(): Promise<boolean> {
    try {
      this.analyzer = await imageSuperResolution.ImageSRAnalyzer.create();
      this.unavailableUntil = 0;
      hilog.info(DOMAIN, TAG, 'sr init ok');
      return true;
    } catch (e) {
      const err: BusinessError = e as BusinessError;
      this.analyzer = undefined;
      this.unavailableUntil = Date.now() + SR_INIT_COOLDOWN_MS;
      hilog.warn(DOMAIN, TAG, 'sr init failed code=%{public}d msg=%{public}s',
        err !== undefined ? (err.code | 0) : -1,
        err !== undefined && err.message !== undefined ? err.message : '');
      return false;
    }
  }

  /**
   * 对一张图做超分。
   *
   * @param src 输入像素图（**不转移所有权**：只作为推理输入，调用方继续持有它）
   * @param timeoutMs 超时上限；到点立刻返回 undefined，迟到的产物会被 release
   *
   * 返回的 `pixelMap` 所有权**归调用方**（需要 release）。
   */
  async enhance(src: image.PixelMap | undefined, timeoutMs: number): Promise<SuperResOutcome> {
    const started: number = Date.now();
    const fail = (reason: string): SuperResOutcome => {
      return { pixelMap: undefined, reason: reason, elapsedMs: Date.now() - started };
    };
    if (src === undefined) {
      return fail('no-src');
    }
    if (!(await this.ensureReady())) {
      return fail('unavailable');
    }
    const analyzer: imageSuperResolution.ImageSRAnalyzer | undefined = this.analyzer;
    if (analyzer === undefined) {
      return fail('unavailable');
    }
    const budget: number = (timeoutMs > 0) ? Math.round(timeoutMs) : 1;

    // 请求体必须是类实例；inputData 用 ImageData 结构（{ pixelMap }）。
    let req: visionBase.Request | undefined = undefined;
    try {
      req = new visionBase.Request();
      req.inputData = { pixelMap: src };
    } catch (e) {
      return fail('bad-request');
    }

    return new Promise<SuperResOutcome>((resolve: (v: SuperResOutcome) => void): void => {
      let done: boolean = false;
      const finish = (out: image.PixelMap | undefined, reason: string): void => {
        if (done) {
          // 超时后才回来的产物：这里必须释放，否则每次超时都漏一张大图
          this.releaseQuietly(out);
          return;
        }
        done = true;
        clearTimeout(timer);
        resolve({ pixelMap: out, reason: reason, elapsedMs: Date.now() - started });
      };
      // 超时闸门：到点就认降级，画面立刻用原图渲染，绝不等待推理
      const timer: number = setTimeout((): void => {
        if (done) {
          return;
        }
        done = true;
        hilog.warn(DOMAIN, TAG, 'sr timeout after %{public}dms', budget);
        resolve({ pixelMap: undefined, reason: 'timeout', elapsedMs: Date.now() - started });
      }, budget);

      analyzer.process(req as visionBase.Request).then((resp: imageSuperResolution.ISPResponse): void => {
        const px: image.PixelMap | undefined = resp !== undefined ? resp.pixelMap : undefined;
        finish(px, px === undefined ? 'empty-result' : '');
      }).catch((e: BusinessError): void => {
        const code: number = e !== undefined ? (e.code | 0) : -1;
        // 服务异常多数是临时的（模型被回收 / 并发受限），不在这里永久禁用，交给上层按次降级
        hilog.warn(DOMAIN, TAG, 'sr process failed code=%{public}d', code);
        finish(undefined, 'error:' + code);
      });
    });
  }

  private releaseQuietly(px: image.PixelMap | undefined): void {
    if (px === undefined) {
      return;
    }
    try {
      px.release();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'sr release skipped');
    }
  }

  /** 页面销毁时调用：释放推理服务（失败只记日志，不抛）。 */
  async destroy(): Promise<void> {
    const a: imageSuperResolution.ImageSRAnalyzer | undefined = this.analyzer;
    this.analyzer = undefined;
    if (a === undefined) {
      return;
    }
    try {
      await a.destroy();
      hilog.info(DOMAIN, TAG, 'sr destroyed');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'sr destroy failed');
    }
  }
}
