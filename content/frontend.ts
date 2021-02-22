import {
  doc, isTop, injector, initialDocState, set_esc, esc, setupEventListener, set_isEnabled_, XrayedObject,
  set_clickable_, clickable_, isAlive_, set_VTr, setupKeydownEvents, onWndFocus, includes_,
  set_readyState_, readyState_, callFunc, recordLog, set_vApi, vApi, locHref, unwrap_ff, raw_unwrap_ff, math, OnFirefox, OnChrome, OnEdge,
} from "../lib/utils"
import { suppressTail_, getMappedKey } from "../lib/keyboard_utils"
import { frameElement_, set_OnDocLoaded_ } from "../lib/dom_utils"
import { wndSize_ } from "../lib/rect"
import {
  safePost, set_port_, runtime_port, SafeDestoryF, set_safeDestroy,
  runtimeConnect, safeDestroy, post_, send_, hookOnWnd, requestHandlers, contentCommands_,
} from "./port"
import {
  ui_box, adjustUI, getParentVApi, set_getParentVApi, set_getWndVApi_ff, learnCSS, ui_root, flash_,
} from "./dom_ui"
import { grabBackFocus } from "./insert"
import { currentKeys } from "./key_handler"
import { set_needToRetryParentClickable, focusAndRun } from "./request_handlers"
import { coreHints } from "./link_hints"
import { executeScroll, scrollTick, $sc, keyIsDown as scroll_keyIsDown } from "./scroller"
import { onLoad as findOnLoad, find_box } from "./mode_find"
import { filterTextToGoNext, jumpToNextLink } from "./pagination"
import { main_not_ff as extend_click_not_ff } from  "./extend_click"
import { main_ff as extend_click_ff } from  "./extend_click_ff"
import { RSC } from "./commands"

declare var XPCNativeWrapper: <T extends object> (wrapped: T) => XrayedObject<T>;

const docReadyListeners: Array<(this: void) => void> = [], completeListeners: Array<(this: void) => void> = []

set_safeDestroy((silent?: Parameters<SafeDestoryF>[0]): void => {
    if (!isAlive_) { return; }
    if (OnFirefox && silent === 9) {
      set_port_(null)
      return;
    }
    set_isEnabled_(!1)
    hookOnWnd(HookAction.Destroy);

    contentCommands_[kFgCmd.insertMode]({r: 2})
    vApi.e && vApi.e(kContentCmd.Destroy);
    ui_box && adjustUI(2);

    set_esc(null as never)
    VApi = null as never;

    if (!Build.NDEBUG) {
      injector || define.noConflict()
    }

    if (runtime_port) { try { runtime_port.disconnect(); } catch {} }
    silent || recordLog("Vimium C on %o has been destroyed at %o.")
    injector || (<RegExpOne> /a?/).test("");
})

set_vApi(VApi = {
  b: coreHints, e: null, z: null,
  p: post_, a: setupKeydownEvents, f: focusAndRun, d: safeDestroy, g: filterTextToGoNext, j: jumpToNextLink,
  n: findOnLoad, c: executeScroll,
  k: scrollTick, $: $sc, l: learnCSS, m: getMappedKey,
  i: OnFirefox ? wndSize_ : 0 as never,
  r: injector && [send_, safePost, (task: 0 | 1 | 2, arg?: string | ElementSet | VTransType): any => {
    task < 1 ? (arg = currentKeys, /*#__NOINLINE__*/ esc!(HandlerResult.Nothing))
      : task < 2 ? set_clickable_(arg as ElementSet)
      : set_VTr(arg as VTransType)
    return arg
  }], s: suppressTail_, t: requestHandlers[kBgReq.showHUD], u: locHref, x: flash_,
  y: OnFirefox ? () => ( {
    w: onWndFocus, b: find_box, c: clickable_, k: scroll_keyIsDown, r: ui_root
  } ) : () => ( {  b: find_box, c: clickable_, k: scroll_keyIsDown, r: ui_root } )
})

if (OnFirefox && injector === void 0) {
  ((): void => {
    type Comparer = (this: void, rand2: number, testEncrypted: string) => boolean
    type SandboxGetterFunc = (this: void, comparer: Comparer, rand1: number) => VApiTy | 0 | null | undefined | void
    type GetterWrapper = { _get: SandboxGetterFunc }
    type WindowWithGetter = Window & { __VimiumC__: GetterWrapper }
    let randomKey = 0, recvTick = 0, sendTick = 0
    const name = BuildStr.CoreGetterFuncName as string as "__VimiumC__"
    const encrypt = (trustedRand: number, unsafeRand: number): string => {
        trustedRand += (unsafeRand >= 0 && unsafeRand < 1 ? unsafeRand : trustedRand);
        let a = (0x8000 * trustedRand) | 0,
        host = new URL((browser as typeof chrome).runtime.getURL("")).host.replace(<RegExpG> /-/g, "");
        return ((host + (
              typeof BuildStr.RandomReq === "number" ? (BuildStr.RandomReq as number | string as number).toString(16)
              : BuildStr.RandomReq)
            ).match(<RegExpG> /[\da-f]{1,4}/gi)!
            ).map((i, ind) => parseInt(i, 16) & (ind & 1 ? ~a : a)).join("");
    }
    const comparer: Comparer = (rand2, testEncrypted): boolean => {
        "use strict";
        /*! @OUTPUT {"use strict";} */
        const diff = encrypt(randomKey, +rand2) !== testEncrypted, d2 = recvTick > 64
        recvTick += d2 ? 0 : diff ? 2 : 1
        return diff || d2; // hide the real result if too many errors
    }
    const getterWrapper: GetterWrapper = Object.defineProperty(raw_unwrap_ff(new window.Object() as GetterWrapper)!
          , "_get", { value (maybeComparer, rand1): VApiTy | void {
        let rand2 = math.random(), toStr = hookOnWnd.toString
        // an ES6 method function is always using the strict mode, so the arguments are inaccessible outside it
        if (sendTick > GlobalConsts.MaxRetryTimesForSecret
            // if `comparer` is a Proxy, then `toString` returns "[native code]", so the line below is safe
            || toStr.call(maybeComparer) !== toStr.call(comparer)
            || maybeComparer(rand2, encrypt(rand2, +rand1))) {
          if (sendTick < GlobalConsts.MaxRetryTimesForSecret + 10) {
            sendTick++
          }
          return
        }
        return vApi
    } })
    /** Note: this function needs to be safe enough */
    set_getWndVApi_ff((anotherWnd: Window): VApiTy | null | void => {
      recvTick = -1
      // Sometimes an `anotherWnd` has neither `.wrappedJSObject` nor `coreTester`,
      // usually when a child frame is hidden. Tested on QQMail (destkop version) on Firefox 74.
      // So add `|| anotherWnd` for less exceptions
      try {
        let core: ReturnType<SandboxGetterFunc>,
        wrapper = unwrap_ff(anotherWnd as XrayedObject<WindowWithGetter>)[name],
        getter = wrapper && wrapper._get
        return getter && (core = getter(comparer, randomKey = math.random())) && !recvTick ? core : null
      } catch {}
    })
    // on Firefox, such an exposed function can only be called from privileged environments
    try {
      raw_unwrap_ff(window as XrayedObject<WindowWithGetter>)![name] = getterWrapper
    } catch { // if window[name] is not configurable
      set_getWndVApi_ff(() => {})
    }
  })()
}
if (!(isTop || injector)) {
  const scoped_parApi = OnFirefox ? frameElement_() && getParentVApi() : getParentVApi()
  if (!scoped_parApi) {
      if ((!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet
          || WeakSet) && <boolean> grabBackFocus) {
        set_needToRetryParentClickable(1)
        if (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
            || (Build.MinCVer >= BrowserVer.Min$Set$Has$$forEach ? Set : Set && Set.prototype.forEach)) {
          set_clickable_(new Set!<Element>())
        } else {
          type ElementArraySet = Element[] & ElementSet
          set_clickable_([] as any as ElementArraySet)
          clickable_.add = (clickable_ as ElementArraySet).push;
          // a temp collection on a very old Chrome, so it's okay just to ignore its elements
          clickable_.has =
              !OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes
              ? (clickable_ as ElementArraySet).includes! : includes_
        }
      }
  } else if (OnFirefox) {
    /*#__NOINLINE__*/ (function (): void {
      try { // `vApi` is still unsafe
          const state = scoped_parApi.y()
          if ((OnFirefox ? state.b && XPCNativeWrapper(state.b) : state.b) === frameElement_()) {
            safeDestroy(1);
            scoped_parApi.n()
          } else {
            set_clickable_(state.c)
          }
          return;
      } catch (e) {
        if (!Build.NDEBUG) {
          console.log("Assert error: Parent frame check breaks:", e);
        }
      }
      if (<boolean> /** is_readyState_loading */ grabBackFocus) {
        // here the parent `core` is invalid - maybe from a fake provider
        set_getParentVApi(() => null)
      }
    })()
  } else {
      // if not `vfind`, then a parent may have destroyed for unknown reasons
      if (scoped_parApi.y().b === frameElement_()) {
        safeDestroy(1);
        scoped_parApi.n();
      } else {
        set_clickable_(scoped_parApi.y().c)
      }
  }
}

if (isAlive_) {
    interface ElementWithClickable { vimiumClick?: boolean }
    set_clickable_(clickable_ || (!OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet)
          || WeakSet ? new WeakSet!<Element>() as never : {
        add (element: Element): any { (element as ElementWithClickable).vimiumClick = true },
        has: (element: Element): boolean => !!(element as ElementWithClickable).vimiumClick
    }))
    // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
    hookOnWnd(HookAction.Install);
    if (initialDocState < "i") {
      set_OnDocLoaded_(callFunc)
    } else {
      set_OnDocLoaded_((callback, onloaded) => {
        readyState_ < "l" && !onloaded ? callback() : (onloaded ? completeListeners : docReadyListeners).push(callback)
      })
    }

    runtimeConnect();

  if (injector === void 0) {
    if (OnFirefox) {
      /*#__INLINE__*/ extend_click_ff()
    } else {
      /*#__INLINE__*/ extend_click_not_ff()
    }
  }

  initialDocState < "i" || setupEventListener(0, RSC, function _onReadyStateChange(): void {
    set_readyState_(doc.readyState)
    const loaded = readyState_ < "i", arr = loaded ? completeListeners : docReadyListeners
    if (loaded) {
      set_OnDocLoaded_(callFunc)
      setupEventListener(0, RSC, _onReadyStateChange, 1)
    }
    arr.forEach(callFunc)
    arr.length = 0
  })
}

if (OnChrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
    const StringCls = String.prototype;
    /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
    if (!"".startsWith) {
      StringCls.startsWith = function (this: string, s: string): boolean {
        return this.lastIndexOf(s, 0) === 0;
      };
      StringCls.endsWith = function (this: string, s: string): boolean {
        const i = this.length - s.length;
        return i >= 0 && this.indexOf(s, i) === i;
      };
    } else if (Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
      Promise.resolve || (Promise.resolve = Promise.resolved!)
    }
    StringCls.includes = function (this: string, s: string, pos?: number): boolean {
    // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0;
    };
}

if (!(Build.NDEBUG || GlobalConsts.MaxNumberOfNextPatterns <= 255)) {
  console.log("Assert error: GlobalConsts.MaxNumberOfNextPatterns <= 255");
}

if (!(Build.NDEBUG || BrowserVer.Min$Set$Has$$forEach <= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol)) {
  console.log("Assert error: BrowserVer.Min$Set$Has$$forEach <= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol");
}

if (!Build.NDEBUG) {
  (contentCommands_ as unknown as any[]).forEach((x, i) => x || alert(`Assert error: missing contentCommands_[${i}]`));
  (requestHandlers as unknown as any[]).forEach((x, i) => x ||
      i === kBgReq.injectorRun || alert(`Assert error: missing requestHandlers[${i}]`))
}
