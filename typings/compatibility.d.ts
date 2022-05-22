/**
 * #define EXPERIMENTAL (#enable-experimental-web-platform-features \
 *    && #enable-javascript-harmony \
 *    && #enable-experimental-canvas-features \
 * )
 * #define LEGACY (#disable-javascript-harmony-shipping)
 * #define EMPTY ((a clean User Data)
 * #define LATEST_TESTED 73.0.3683.86
 */
declare const enum BrowserVer {
  // display:flex still exists on C31 (C29, from MDN)
  MinShadowDOMV0 = 31, // the real version is <= C31; it's prefixed
  // mouseEvent.buttons is since C43 but a `buttons` property does no harm on Chrome <= 42
  MinUsable$MouseEvent$$constructor = 31, // the real version is <= C31
  MinMaybe$String$$StartsWithAndEndsWith = 31, // the real version is <= C31; if EXPERIMENTAL
  MinEnsured$onwheel = 31, // even if LEGACY
  MinFormatOptionWhenCaptureTab = 31, // even if LEGACY
  MinSupported = 32,
  MinEnsuredES6Promise = 32, // even if LEGACY
  // the 5 below are correct even if EXPERIMENTAL or LEGACY
  Min$URL$NewableAndInstancesHaveProperties = 32,
  Min$KeyboardEvent$$Repeat$ExistsButNotWork = 32, // replaced by MinCorrect$KeyboardEvent$$Repeat (C38)
  Min$document$$hidden = 33, // unprefixed; .webkitHidden still exists on C31
  // `<input type=number>.selectionStart` throws since Chrome 33 and before C58 (Min$selectionStart$MayBeNull),
  Min$selectionStart$MayThrow = 33,
  Min$Promise$$Then$Accepts$null = 33,
  Maybe$Promise$onlyHas$$resolved = 33, // only if EXPERIMENTAL
  // before 33, `a=activeElement; a.blur(); a.focus()` can not make its iframe grab focus
  MinFocusIframeDirectlyWithout$wnd$$focus = 33, // even if EXPERIMENTAL or LEGACY; need .contentWindow.focus() before
  MinDocument$visibilityState = 33,
  MinCSSWidthUnit$vw$InCalc = 34, // even if EXPERIMENTAL or LEGACY
  Min$Object$$setPrototypeOf = 34,
  // before C34, 2 images share a size part (the first one's), and different height/width would work as the smaller one
  /** {@see ../pages/options.css#select { background: ...; }} */
  MinMultipleBackgroundImagesNotShareSizePart = 34,
  // on C34 and if EXPERIMENTAL, then it's not implied; before C37, `'unsafe-inline'` is necessary in CSP
  StyleSrc$UnsafeInline$MayNotImply$UnsafeEval = 34,
  Min$String$$Normalize = 34, // even if EXPERIMENTAL or LEGACY
  Min$Element$$matches = 34, // even if EXPERIMENTAL or LEGACY
  MinEnsuredUnprefixedShadowDOMV0 = 35, // even if LEGACY
  MinEnsured$Event$$Path = 35, // = MinEnsuredUnprefixedShadowDOMV0
  // there're WeakMap, WeakSet, Map, Set and Symbol on C31, if #enable-javascript-harmony
  Min$String$document$$all$isCorrect = 36, // even if EXPERIMENTAL or LEGACY; before C36, it returns `"undefined"`
  MinEnsuredES6WeakMapAndWeakSet = 36,
  Min$Set$Has$$forEach = 36, // if #enable-javascript-harmony
  // but shadowRoot.getElementById still exists on C31
  Min$DocumentFragment$$getElementById = 36, // even if EXPERIMENTAL or LEGACY
  MinPhysicalPixelOnWindows = 37, // even if EXPERIMENTAL or LEGACY; replaced by MinHighDPIOnWindows
  // before C37, if a page has no `'unsafe-inline'` in its CSP::`style-src`, then Vimium's styles is totally broken
  MinStyleSrcInCSPNotBreakUI = 37, // even if EXPERIMENTAL or LEGACY
  MinSessions = 37,
  // even if EXPERIMENTAL; Note: should use MinUsableCSS$All
  // so this is deprecated
  MinUnsafeCSS$All$Attr = 37,
  /*
   * an `all:initial` prevents position/z-index attrs in other matched rules from working
   * this Chrome bug causes the help dialog may have `position: static;`
   * * the initial "position" attr and rendered view are correct
   * * but after a mousemove / wheel, the "position" attr becomes "static" and the view breaks
   * * it recovers if modifying its position/z-index attr
   * * if the Dev Tools is on, and visits styles of the box, then a mousemove won't break the UI
   *
   * a work-around is set <div>.style.position,
   * but the HUD is also affected when pressing <Shift> to switch LinkHint mode,
   * so must remove the all: before MinFixedCSS$All$MayMistakenlyResetFixedPosition
   */
  MinCSS$All$MayMistakenlyResetFixedPosition = 37,
  MinEnsuredHTMLDialogElement = 37, // not on Edge; under a flag since FF53; still exists on C31 if EXPERIMENTAL
  // since C37, if EXPERIMENTAL `Symbol.iterator` is valid and `for-of` can be used on Set and Map
  MinMaybe$Symbol$$Iterator$existsAndWorksFor$Set$and$Map = 37,
  // for-of is only for generators before C38, so an array can not be iterated on C37 even if EXPERIMENTAL
  MinEnsuredES6$ForOf$Map$SetAnd$Symbol = 38, // even if LEGACY; still exists on C31 if EXPERIMENTAL
  BuildMinForOf = 38,
  // .repeat exists since C32, but only works since C38, even if EXPERIMENTAL
  // because there seems no simple fix, just ignore it
  // https://bugs.chromium.org/p/chromium/issues/detail?id=394907
  MinCorrect$KeyboardEvent$$Repeat = 38,
  MinEnsuredTextEncoderAndDecoder = 38, // even if LEGACY; still exists on C31 if EXPERIMENTAL
  MinEnsured$Math$$log2 = 38, // even if LEGACY; exists on C34 if EXPERIMENTAL
  MinNewWeakSetWithSetOrArray = 38, // `s=new Set();s.add(a={});new WeakSet(s).has(a)` : even if EXPERIMENTAL or LEGACY
  MinCmdArg$__javascript_harmony = 39, // before C39, it's not `--javascript-harmony` but `--js-flags=--harmony`
  MinWithFrameIdInArg = 39,
  // only cause event#load even if failing in decoding its data. Test code:
  // var a=new XMLHttpRequest();a.open("GET","data:text/plain;charset=utf-8,%E9%9A",!0);
  // a.onerror=a.onload=function(i){console.log(i.type,i)};a.responseType='text';a.send();
  MinRequestDataURLOnBackgroundPage = 39, // even if EXPERIMENTAL or LEGACY
  Min$Set$accept$Symbol$$Iterator = 39, // even if EXPERIMENTAL or LEGACY; test code: new Set('foo')
  MinEnsuredGeneratorFunction = 39, // even if LEGACY; exists on C31 if EXPERIMENTAL
  MinOptionsUI = 40,
  MinDisableMoveTabAcrossIncognito = 40,
  // even if EXPERIMENTAL or LEGACY
  MinWarningSyncXHR = 40,
  MinEnsured$Element$$Closest = 41, // even if LEGACY
  MinWithFrameId = 41,
  // just means it's enabled by default
  Min$String$$StartsWithEndsWithAndIncludes$ByDefault = 41, // no "".includes before 41 even if EXPERIMENTAL
  MinGlobal$HTMLDetailsElement = 41,
  MinFixedCSS$All$MightOverwriteFixedPosition = 41,
  // ignore MinFixedCSS$All$MightOverwriteAnchorColor
  MinUsableCSS$All = MinFixedCSS$All$MightOverwriteFixedPosition,
  // (if EXPERIMENTAL, then it exists since C34 but) has no effects before C41;
  // if EXPERIMENTAL, there's Element::scrollTo and Element::scrollBy only since C41
  MinCSS$ScrollBehavior$$Smooth$Work = 41,
  // MethodFunction is accepted since C42 if EMPTY
  MinMayBeES6MethodFunction = 41, // if EXPERIMENTAL
  MinMaybe$fetch$And$Request = 41, // if EXPERIMENTAL
  // before 42, event.path is a simple NodeList instance ; even if EXPERIMENTAL or LEGACY
  Min$Event$$path$IsStdArrayAndIncludesWindow = 42,
  Min$Tabs$$getZoom = 42,
  Min$Tabs$$setZoom = 42,
  Min$EnableSitePerProcess$Flag = 42,
  // 'shadowRoot' in Element.prototype since C43, and 'assignedSlot' since C53, even if EXPERIMENTAL or LEGACY
  MinParentNodeGetterInNodePrototype = 42, // also .childNodes; even if EXPERIMENTAL or LEGACY
  MinEnsured$fetch = 42, // even if LEGACY; also window.Request; can not fetch chrome-extension:// before C47
  // before C43, "font-size: ***" of <select> overrides those of its <options>s'
  // since C42@exp, <option> is visible, but its text has a strange extra prefix of "A" - fixed on C43
  Min$Option$HasReliableFontSize = 43, // even if LEGACY
  Min$DocumentOrShadowRoot$$elementsFromPoint = 43, // even if EXPERIMENTAL or LEGACY
  MinEnsuredES6LetAndConst = 43, // even if LEGACY; only in "use strict" mode
  MinEnsuredES6$String$$StartsWithEndsWithRepeatAndIncludes = 43, // even if LEGACY
  MinSafe$String$$StartsWith = MinEnsuredES6$String$$StartsWithEndsWithRepeatAndIncludes,
  MinEnsuredES6$String$$fromCodePoint = 43, // even if LEGACY; since C41 if not
  MinRuntimePlatformOs = 44,
  MinCreateWndWithState = 44,
  // the 3 below are correct even if EXPERIMENTAL or LEGACY
  // #scroll-top-left-interop is also since C44
  // `scrollingElement` is added in (commit 8df26a52e71e5b239c3749ec6f4180441ee4fc7e)
  // before C44, the real scrolling may be <body> even if document.compatMode is "CSS1Compat"
  // - it's said this behavior is for compatibility with websites at that time
  Min$Document$$ScrollingElement = 44,
  MinTreat$LetterColon$AsFilePath = 44,
  MinFixedCSS$All$MightOverwriteAnchorColor = 44, // affect links on the help dialog; ignored
  // the 2 below are even if EXPERIMENTAL or EMPTY
  MinMayBeES6ArrowFunction = 45,
  // for VHints.traverse_, Array.from takes >= 2x time to convert a static NodeList of 7242 elements to an array
  // and the average time data is 119~126ms / 255~266ms for 100 times
  Min$Array$$From = 45,
  Min$TypedArray$reduce = 45,
  // even if LEGACY
  MinEnsuredES6MethodFunction = 45, // e.g.: `a = { b() {} }`
  MinMuted = 45,
  MinTabAudible = 45,
  // https://www.chromestatus.com/features/5697181675683840
  MinNoMousePositionUpdatesWhenScrolling = 45, // replaced by MinRuntimeFlag$UpdateHoverAtBeginFrame
  // the 3 below are even if EXPERIMENTAL or LEGACY
  Min$Array$$find$$findIndex = 45,
  MinAutoDecodeJSURL = 46,
  Min$Event$$IsTrusted = 46,
  MinMutedInfo = 46,
  // occur on Chrome 46 if EXPERIMENTAL; always enabled since C47 even if LEGACY
  MinMayBe$requestIdleCallback = 46,
  MinMaybeES$Array$$Includes = 46, // if EXPERIMENTAL
  Min$windows$APIsFilterOutDevToolsByDefault = 46,
  Min$windows$$GetAll$SupportWindowTypes = 46,
  Min$CSS$$escape = 46, // even if EXPERIMENTAL or LEGACY
  MinEnsured$requestIdleCallback = 47,
  Min$Tabs$$Query$RejectHash = 47,
  // if .key exists, it's "v" for `v`, but "" (empty) for `<c-v>` - doesn't support all cases
  Min$KeyboardEvent$MayHave$$Key = 47, // if EXPERIMENTAL
  Min$IFrame$MayHave$$Referrerpolicy = 47, // if EXPERIMENTAL
  MinEnsured$InputDeviceCapabilities = 47, // even if LEGACY; also ensured UIEvent.sourceCapabilities
  MinEnsured$Object$$assign = 47, // even if LEGACY; since C45 if only no LEGACY
  MinFetchExtensionFiles = 47, // even if EXPERIMENTAL or LEGACY
  MinFetchDataURL = 48, // even if EXPERIMENTAL; test code: fetch('data:,abc').then(i=>i.text()).then(cb,cb)
  // even if EXPERIMENTAL or LEGACY
  // before: real_width := Math.floor(width * zoom)
  // after: real_width := Math.floor(width * zoom) || (width ? 1 : 0)
  MinEnsuredBorderWidthWithoutDeviceInfo = 48, // inc 0.0001px to the min "visible" width
  FlooredBoxShadowSpreadWidth = 48, // real_width := Math.floor(width * zoom)
  // if LEGACY, arrow functions will be accepted only since C48,
  // but this flag will break the Developer Tools (can not open the window) on Chrome 46/47/48,
  // so Chrome can only debug arrow functions since 49
  MinEnsuredES6ArrowFunction = 48,
  MinEnsuredES6SpreadOperator = 48,
  MinEnsuredES6NewTarget = 48, // even if LEGACY; since 46 if not
  // even if EXPERIMENTAL or LEGACY
  MinSafeGlobal$frameElement = 48,
  // just means it's enabled even if LEGACY;
  // if EXPERIMENTAL, .code is "" on Chrome 42/43, and works well since C44
  MinEnsured$KeyboardEvent$$Code = 48,
  MinMayBeShadowDOMV1 = 48, // if EXPERIMENTAL
  // a path of an older DOMActivate event has all nodes (windows -> nodes in shadow DOM)
  // this feature is enabled by default on C53, 54, 55;
  // and replaced by MinDOMActivateInClosedShadowRootHasNoShadowNodesInPathWhenOnDocument since C56
  MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument = 48, // if EXPERIMENTAL
  MinEnsuredTouchEventConstructor = 48, // even if LEGACY
  MinEnsuredBorderAndBoxWidthWithoutDeviceInfo = 49, // inc 0.0001px to the min "visible" width
  // since C46 (MinMaybeES$Array$$Includes) if EXPERIMENTAL; since C47 if not LEGACY
  MinEnsuredES$Array$$Includes = 49, // even if LEGACY
  // the 3 below are correct even if EXPERIMENTAL or LEGACY
  MinSafeWndPostMessageAcrossProcesses = 49,
  MinES6No$Promise$$defer = 49,
  Min$resolve$Promise$MeansThen = 49, // see {@doc ./tests/unit/order-when-resolve-promise.html}
  /* content scripts are always injected (tested on Chrome from 35 to 66), and can always be listed by the Dev Tools */
  // even if EXPERIMENTAL or LEGACY; length of an older addEventListener is 0
  Min$addEventListener$$length$Is2 = 49,
  // by default, `noreferrer` can also make `opener` null, and it still works on C35
  // a single `noopener` only works since C49 even if EXPERIMENTAL or LEGACY
  MinLinkRelAcceptNoopener = 49,
  Min$webNavigation$$getFrame$IgnoreProcessId = 49,
  MinSVG$Path$MayHave$d$CSSAttribute = 49, // if EXPERIMENTAL
  MinEnsuredCSSVariables = 49, // even if LEGACY; works on C48 if EXPERIMENTAL
  MinTestedES6Environment = 49, // must be <= MinEnsuredFullES6Environment
  MinCSS$whiteSpace$$pre$Means$overflowWrap$$normal = 49, // even if EXPERIMENTAL
  MinEnsuredCaseInSensitiveAttrSelector = 49, // even if LEGACY; since C38 if EXPERIMENTAL
  // Object.observe is from C36 to C49 even if EXPERIMENTAL or LEGACY
  MinES6No$Object$$Observe = 50,
  // The real support for arg frameId of chrome.tabs.executeScript is since C50,
  //   and is neither 41 (an older version) nor 39 (cur ver on 2018-02-18)
  //   in https://developer.chrome.com/extensions/tabs#method-executeScript.
  // And, all "since C39" lines are totally wrong in the 2018-02-18 version of `tabs.executeScript`
  Min$tabs$$executeScript$hasFrameIdArg = 50,
  MinSVG$Path$Has$Use$Attribute = 50, // <path use="..." />
  MinMaybe$window$$InputEvent = 50, // only if EXPERIMENTAL
  // MinShowBlockForBrokenImage = 51, // not reproduced
  MinEnsuredIFrameReferrerpolicy = 51,
  MinEnsured$KeyboardEvent$$Key = 51,
  // the 6 below are correct even if EXPERIMENTAL or LEGACY
  MinPassiveEventListener = 51,
  // before C51, if an iframe has no scrollable boxes, its parent frame scrolls and gets events
  // since C51, its parent still scrolls but gets no wheel events
  MinNotPassMouseWheelToParentFrameEvenIfSelfNotScrolled = 51,
  MinNoCustomMessageOnBeforeUnload = 51,
  MinShadowDOMV1HasMode = 51,
  Min$Node$$isConnected = 51, // not on Edge
  Min$ScrollIntoView$SetTabNavigationNode = 51,
  MinEnsured$Reflect$$apply$And$$construct = 51, // even if LEGACY
  // Chrome also began to put contain attr in use on 51 if EXPERIMENTAL
  // but obviously there's some bugs about this feature
  CSS$Contain$BreaksHelpDialogSize = 51,
  MinEnsured$ForOf$ForDOMListTypes = 51, // NodeList has also forEach (neither HTMLCollection nor ClientRectList)
  // test: var {a,b,c}={a:(...a)=>[-1,`${Math.sign(2)}`,...a],b(i=2){return i*6}, ['c'](d){let j=class A{};return ""+j}}
  // on C51, the above passes, but the Developer Tools can not be opened if LEGACY
  MinMaybeES$Object$$values$and$$entries = 51, // if EXPERIMENTAL; since C56 even if LEGACY
  MinEnsuredFullES6Environment = 52,
  // the 2 below are correct even if EXPERIMENTAL or LEGACY
  MinNoAbnormalIncognito = 52,
  // since https://github.com/chromium/chromium/commit/866d1237c72059624def2242e218a7dfe78b125e
  MinEventListenersFromExtensionOnSandboxedPage = 52,
  // the 4 below are correct even if LEGACY
  MinEnsuredCSSEnableContain = 52, // on C51, not exists unless EXPERIMENTAL
  MinEnsuredSVG$Path$Has$d$CSSAttribute = 52, // svg path { d: path('...'); } ; on C51, not exists unless EXPERIMENTAL
  MinForcedDirectWriteOnWindows = 52,
  // if #enable-site-per-process or #enable-top-document-isolation,
  // for 3rd-party child frames in other processes, it keeps the same only since C52 even if EXPERIMENTAL
  MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent = 52,
  MinPositionMayBeSticky = 52, // if EXPERIMENTAL; enabled by default since C56 even if LEGACY
  MinAutoScrollerAllocNewSpace = 53, // even if EXPERIMENTAL or LEGACY; if box-sizing is content-box
  MinEnsuredShadowDOMV1 = 53,
  // since C53, Vimium's inner styles have been really safe, because `>>>` only works on "open" mode shadow trees
  MinEnsuredSafeInnerCSS = MinEnsuredShadowDOMV1,
  MinEnsuredWebkitUserSelectAll = 53, // `-webkit-user-select: all` still works on C31 if EXPERIMENTAL
  // even if EXPERIMENTAL or LEGACY
  MinUntrustedEventsDoNothing = 53, // fake click events won't show a <select>'s popup
  MinEnsuredUnicodeFlagInRegExp = 53, // even if LEGACY
  // before Chrome 53, there may be window.VisualViewport under flags, but not the instance
  // between C53 and C59, `visualViewport` only has .clientW/H .scrollL/T, .pageX/Y and .scale
  Min$visualViewport$UnderFlags = 53, // window.visualViewport occurs if EXPERIMENTAL (though not on C60)
  MinCSS$filter = 53,
  // only Chrome accepts it:
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extension/getViews
  Min$Extension$$GetView$AcceptsTabId = 54,
  Min$tabs$$discard = 54,
  MinEnsured$ParentNode$$appendAndPrepend = 54, // even if LEGACY
  // the 11 below are correct even if EXPERIMENTAL or LEGACY
  MinUnprefixedUserSelect = 54,
  MinHighDPIOnWindows = 54, // replace MinPhysicalPixelOnWindows
  MinNo$KeyboardEvent$$keyIdentifier = 54,
  Min$HTMLAreaElement$rel = 54,
  // https://chromium.googlesource.com/chromium/src/+/9520623861da283533e71d6b7a8babd02675cb0b
  Min$Node$$getRootNode = 54, // not on Edge
  MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM = 55,
  // before C55, onActivate should only be installed on document
  Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow = 55,
  Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow = 55,
  Min$SVGElement$$dataset = 55,
  // MinStricterArgsIn$Windows$$Create = 55, // I forget what's stricter
  MinSomeDocumentListenersArePassiveByDefault = 56,
  Min$addEventListener$support$once = 55,
  // not need if LEGACY or EMPTY (even on Chrome 66)
  MinMayNeedCSPForScriptsFromOtherExtensions = 56, // if EXPERIMENTAL
  // the 3 below are correct even if EXPERIMENTAL or LEGACY
  MinDOMActivateInClosedShadowRootHasNoShadowNodesInPathWhenOnDocument = 56,
  MinFailToToggleImageOnFileURL = 56,
  // note: an "input" event is not KeyboardEvent: {@see Min$InputEvent$$isComposing}
  Min$KeyboardEvent$$isComposing = 56,
  // the static selector `>>>` is not supported since MinNoSelector$GtGtGt
  // `>>>` can only match those under "open"-mode shadow roots
  MinMaybeStaticSelector$GtGtGt = 56, // only if EXPERIMENTAL
  // also .getOwnPropertyDescriptors
  MinEnsuredES$Object$$values$and$$entries = 56, // even if LEGACY; since C54 if not LEGACY; since C51 if EXPERIMENTAL
  // the 2 below are correct even if EXPERIMENTAL or LEGACY
  MinNoKeygenElement = 57,
  MinCSSPlaceholderPseudo = 57,
  MinEnsuredCSSGrid = 57, // even if LEGACY; still partly works on C35 if EXPERIMENTAL
  MinEnsuredES2017AsyncFunctions = 57, // even if LEGACY
  /*
   * Chrome before 58 does this if #enable-site-per-process or #enable-top-document-isolation;
   * Chrome 56 / 57 always merge extension iframes if EXPERIMENTAL
   * Chrome since 58 always merge extension iframes even if the two flags are disabled and LEGACY
   *
   * Special cases:
   * Chrome 55 does this by default (unless turn one of the flags on and then off);
   * if #enable-top-document-isolation, Chrome since 56 merge them,
   *   while Chrome before 56 move extension iframes into different processes (not shared one)
   *     if not #enable-site-per-process;
   * since C56, if one flag is turned on and then off,
   *   it will still take effects on extension iframes, so extension iframes are always merged,
   *   while Chrome before 56 can turn off them totally
   */
  MinExtIframesAlwaysInSharedProcess = 58,
  MinExtensionContentPageAlwaysCanShowFavIcon = MinExtIframesAlwaysInSharedProcess,
  MinEmbedElementIsNotFunction = 58,
  // the 7 below are correct even if EXPERIMENTAL or LEGACY
  MinTbodyAcceptInnerTextSetter = 58,
  MinCaseSensitiveUseMap = 58,
  // tmp_width := (since 58 ? Math.round : Math.floor)(width * devicePixelRatio * zoom)
  // real_width := width && Math.max(tmp_width, 1)
  MinBorderWidthIsRounded = 58,
  // Chrome changed its behavior to match the new spec on C58 (replace Min$selectionStart$MayThrow)
  Min$selectionStart$MayBeNull = 58,
  MinSetInnerTextOnHTMLHtmlElement = 58,
  // .type is always 'Caret'
  $Selection$NotShowStatusInTextBox = 58, // Now only version 81-110 of Chrome 58 stable have such a problem
  /** @see {@link content/visual.ts#VVisual.init_ } */
  MinSelExtendForwardOnlySkipWhitespaces = 59,
  Min$Space$NotMatch$U180e$InRegExp = 59,
  MinMaybeUnicodePropertyEscapesInRegExp = 59, // only if EXPERIMENTAL
  // the 2 below are correct even if EXPERIMENTAL or LEGACY
  // PasswordSaverDispatchesVirtualFocusEvents (document.activeElement is not updated)
  //   is confirmed on Chrome LATEST_TESTED
  // See `WebFormControlElement::SetAutofillValue` on
  // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/exported/web_form_control_element.cc?l=138
  MinPasswordSaverDispatchesVirtualFocusEvents = 59,
  Min$InputEvent$$isComposing = 60,
  MinEnsured$window$$InputEvent = 60, // even if LEGACY
  MinWarningWebkitGradient = 60, // only happened on a Canary version
  MinOmniboxUIMaxAutocompleteMatchesMayBe12 = 60, // #omnibox-ui-max-autocomplete-matches
  // only if EXPERIMENTAL; tests show there're mouseover/mousedown/mouseup/mouseout events
  // but no click events
  MinMaybeSomeMouseEventsOnDisabledFormControlElements = 60,
  // the 8 below are correct even if EXPERIMENTAL or LEGACY
  MinNoBorderForBrokenImage = 60,
  MinNoSelectionColorOnTextBoxWhenFindModeHUDIsFocused = 60,
  MinEnsuredInputEventIsNotOnlyInShadowDOMV1 = 60, // even if LEGACY; in ShadowDOMV0, "input" will also work on window
  MinEnsured$Intl$$DateTimeFormat$$$formatToParts = 60, // even if LEGACY; since C57 in neither EXPERIMENTAL nor LEGACY
  MinMaybe$HTMLElement$$inert = 60, // if EXPERIMENTAL
  MinTabsCreateRefuseOpenerTabIdIfNotOnCurrentWindow = 61,
  MinRoundedBorderWidthIsNotEnsured = 61, // a border is only showing if `(real_width = width * ratio * zoom) >= 0.5`
  // a bug that special style.zoom may not work is fixed since MinASameZoomOfDocElAsdevPixRatioWorksAgain
  MinDevicePixelRatioImplyZoomOfDocEl = 61,
  MinCorrectBoxWidthForOptionsUI = 61,
  MinInnerWidthKeepsTheSameWhenPinchZooming = 61, // on touch-screen devices
  // visualViewport.width/h, .pageL/T and .offsetL/T occurs, and `innerWidth` is not "scaled"
  MinEnsured$visualViewport$ = 61,
  MinScrollIntoViewOptions = 61,
  // also means ensured Element::scrollBy, Element::scrollTo and window.scrollTo/scrollBy({})
  // not on edge
  MinEnsuredCSS$ScrollBehavior = 61, // still exists since C34 (although has no effects before C41) if EXPERIMENTAL
  // e.g. https://www.google.com.hk/_/chrome/newtab?espv=2&ie=UTF-8
  MinNotRunOnChromeNewTab = 61,
    // according to https://github.com/w3ctag/design-reviews/issues/51#issuecomment-96759374 ,
    // `scrollingElement` can be <frameset> on C44
    // which has been fixed commit 0cf160e2ff055fb12c562cabc2da9e62db14cc8d (if #scroll-top-left-interop is enabled),
    // and it's always fixed since C61
  MinEnsured$ScrollingElement$CannotBeFrameset = 61,
  MinScrollTopLeftInteropIsAlwaysEnabled = 61,
  MinMaybe$Document$$fullscreenElement = 61, // if EXPERIMENTAL
  MinEnsuredScript$type$$module = 61, // even if LEGACY
  Min$performance$$timeOrigin = 62, // even if EXPERIMENTAL or LEGACY
  MinCSS$Color$$RRGGBBAA = 62,
  Min$NotSecure$LabelsForSomeHttpPages = 62, // https://developers.google.com/web/updates/2017/10/nic62#https
  // there's a bug of C62/63 even if EXPERIMENTAL or LEGACY:
  // * if a `createShadowRoot()` from ext isolates after docReady and before wnd.onload,
  //   then some pages using ShadowDOM v0 heavily may be stuck.
  // * before C62 / since C64 / attachShadow has no such a bug
  // https://github.com/philc/vimium/issues/2921#issuecomment-361052160
  CreateShadowRootOnDocReadyBreakPages1 = 62,
  CreateShadowRootOnDocReadyBreakPages2 = 63,
  MinUsableScript$type$$module$InExtensions = 63, // even if EXPERIMENTAL or LEGACY
  // the 8 below are correct even if EXPERIMENTAL or LEGACY
  // `/deep/` works on C35 even if LEGACY
  // static `/deep/` selector in query is still supported on Chrome LATEST_TESTED
  // https://www.chromestatus.com/features/6750456638341120
  MinSelector$deep$InDynamicCssMeansNothing = 63,
  MinCSS$OverscrollBehavior = 63,
  MinOmniboxSupportDeleting = 63,
  MinES$DynamicImport = 63,
  Min$addEventListener$IsInStrictMode = 64, // otherwise addEventListener has null .caller and null .arguments
  MinCSS$textDecorationSkipInk = 64,
  MinNoMultipleShadowRootsOfV0 = 64,
  /** replace {@link #BrowserVer.MinFocusIframeDirectlyWithout$wnd$$focus} */
  MinFocusIframeDirectlyBy$activeElement$$focus = 64, // need .activeElement.blur() or .contentWindow.focus() before
  MinEnsuredUnicodePropertyEscapesInRegExp = 64, // https://www.chromestatus.com/features/6706900393525248
  MinEnsuredFetchRequestCache = 64, // even if LEGACY
  MinEnsuredLookBehindInRegexp = 64, // even if LEGACY
  // a 3rd-party Vomnibar will trigger "navigation" and clear all logs in console on Chrome 64
  // this still occurs on Chrome 65.0.3325.181 (Stable, x64, Windows 10)
  VomnibarMayClearLog1 = 64,
  VomnibarMayClearLog2 = 65,
  // if #enable-md-extensions, it's there since C60
  MinEnsuredChromeURL$ExtensionShortcuts = 65,
  // the 3 below are correct even if EXPERIMENTAL or LEGACY
  /** @todo: trace https://bugs.chromium.org/p/chromium/issues/detail?id=1038569 */
  Min$compositionend$$isComposing$IsMistakenlyFalse = 65,
  MinCanNotRevokeObjectURLAtOnce = 65,
  MinExtraScrollbarWidthIfScrollStyleIsOverlay = 65, // fixed in C87
  MinEnsuredDisplayContents = 65,
  MinInputMode = 66, // even if LEGACY; still works on C35 if EXPERIMENTAL
  // @see MinEscapeHashInBodyOfDataURL
  // https://github.com/chromium/chromium/commit/511efa694bdf9fbed3dc83e3fa4cda12909ce2b6
  MinWarningOfEscapingHashInBodyOfDataURL = 66,
  BorderRadiusCauseBorderDisappearOnIFrame = 66,
  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=582245
  Min$ContentDocument$NotThrow = 67, // even if EXPERIMENTAL or LEGACY
  MinSlotIsNotDisplayContents = 67,
  Min$NotificationOptions$$isClickable$IsDeprecated = 67,
  MinPinchZoomOnWindowsAndTouchpad = 67, // even if EXPERIMENTAL or LEGACY
  // even if EXPERIMENTAL or LEGACY
  // but not on pages whose JS is disabled in chrome://settings/content/siteDetails?site=<origin>
  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=811528
  // the commit is firstly applied to C68:
  // https://github.com/chromium/chromium/commit/5a5267ab58dd0310fc2b427db30de60c0eea4457
  MinEnsuredNewScriptsFromExtensionOnSandboxedPage = 68, // extension can insert and run <script> correctly
  MinASameZoomOfDocElAsdevPixRatioWorksAgain = 68,
  // even if EXPERIMENTAL or LEGACY
  // also on pages with JS disabled in chrome://settings/content/siteDetails?site=<origin>
  NoRAFOrRICOnSandboxedPage = 69,
  MinTabIdMayBeMuchLarger = 69,
  // `>>>` only works if EXPERIMENTAL before C69 and since C56
  // (MinStaticSelector$GtGtGt$IfFlag$ExperimentalWebPlatformFeatures$Enabled)
  // https://github.com/chromium/chromium/commit/c81707c532183d4e6b878041964e85b0441b9f50
  MinNoSelector$GtGtGt = 69,
  // if an element has position:absolute and is at the right/bottom edge, it won't cause the page shows a scrollbar
  MinAbsolutePositionNotCauseScrollbar = 69, // even if EXPERIMENTAL or LEGACY
  MinEnsuredScrollSnapType = 69, // even if LEGACY
  // https://github.com/chromium/chromium/commit/6a866d29f4314b990981119285da46540a50742c
  MinFramesetHasNoNamedGetter = 70,
  MinContainLayoutBreakUIBox = 70, // even if EXPERIMENTAL
  Min$NotificationOptions$$silent = 70,
  // if `toggleCS` repeatedly, then a 3rd-party iframe gets a new CS later than its owner top frame
  // and if reopenTab, the CS is synced among frames again
  MinIframeInRestoredSessionTabHasPreviousTopFrameContentSettings = 70, // even if EXPERIMENTAL or LEGACY
  // test: https://mathiasbynens.be/demo/sort-stability
  MinStableSort = 70, // even if EXPERIMENTAL or LEGACY
  Min$Intl$$DateTimeFormat$$$formatToParts$Use$dayPeriod = 70, // even if EXPERIMENTAL or LEGACY
  MinContainLayoutOnDocAffectPositions = 70, // even if EXPERIMENTAL or LEGACY
  // means unprefixed properties and event name
  MinEnsured$Document$$fullscreenElement = 71, // even if LEGACY; MinMaybe$Document$$fullscreenElement=61
  Min$Tabs$$Update$DoesNotAcceptJavaScriptURLs = 71,
  MinTabIdBeSmallAgain = 71,
  Min$queueMicrotask = 71, // even if EXPERIMENTAL or LEGACY
  Min$globalThis = 71,
  // since C59 if EXPERIMENTAL; enabled by default since C66; C71 is even if LEGACY
  MinEnsured$Function$$toString$preservesWhitespace = 71, // also preserve comments
  Min$tabs$$goBack = 72, // and tabs.goForward; even if EXPERIMENTAL or LEGACY
  // https://www.chromestatus.com/features/5656049583390720
  // deprecation is since C66
  MinEscapeHashInBodyOfDataURL = 72,
  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=908809 seems related with it
  MinElement$Focus$MayMakeArrowKeySelectIt = 72, // if only EXPERIMENTAL (feature #KeyboardFocusableScrollers)
  // https://www.chromestatus.com/features/5722065667620864 , https://mustaqahmed.github.io/user-activation-v2/
  MinUserActivationV2 = 72, // even if EXPERIMENTAL or LEGACY
  // before C72, chrome.permissions report "allowed" on chrome://new-tab-page/*
  MinCorrectExtPermissionsOnChromeURL$NewTabPage = 72, // even if EXPERIMENTAL or LEGACY
  // https://www.chromestatus.com/features/6569666117894144
  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=179006#c45
  MinSpecCompliantShadowBlurRadius = 73,
  // re-implement extension APIs into C++ bindings: @see https://bugs.chromium.org/p/chromium/issues/detail?id=763564
  MinEnsuredNativeCrxBindings = 73, // even if LEGACY
  MinCrossOriginResourcePolicy = 73, // before C75 break file downloading
  Min$StorageArea$$onChanged = 73,
  /** Related: https://chromium.googlesource.com/chromium/src/+/0146a7468d623a36bcb55fc6ae69465702bae7fa%5E%21/#F18
   * Stack Trace:
   * * an `<iframe>` has `embedded_content_view_` member, and has `.IsDisplayNone: () => !embedded_content_view_`
   * * if `.style.display` is updated, its `LayoutEmbeddedContent` layout instance is destroyed
   * * so call `HTMLFrameOwnerElement::SetEmbeddedContentView`, and then `FrameOwnerPropertiesChanged`
   * * in `LocalFrameClientImpl::DidChangeFrameOwnerProperties`, a new `WebFrameOwnerProperties` is created
   *   * it has the latest "is_display_none" state and is passed to `RenderFrameImpl::DidChangeFrameOwnerProperties`
   * * then `ConvertWebFrameOwnerPropertiesToFrameOwnerProperties` is used to convert message classes
   *   * the default value of `FrameOwnerProperties::is_display_none` and `Web~::~` is `false`
   *   * the old code does not sync `.is_display_none`
   *   * this commit 0146a74 begins to update `FrameOwnerProperties::is_display_none`
   * * the child frame gets notified and runs `RenderFrameHostImpl::OnDidChangeFrameOwnerProperties`
   * * `FrameTreeNode::set_frame_owner_properties` is called, and then
   *   * `OnSetFrameOwnerProperties` of either `RenderFrameImpl` or `RenderFrameProxy` is called
   *   * run `WebFrame::SetFrameOwnerProperties` to notify changes and re-compute styles
   */
  MinNoFocusOrSelectionStringOnHiddenIFrame = 74, // even if EXPERIMENTAL or LEGACY
  // https://www.chromestatus.com/features/5650553247891456
  // https://docs.google.com/document/d/1CJgCg7Y31v5MbO14RDHyBAa5Sf0ZnPVtZMiOFCNbgWc/edit
  MinMaybeScrollEndAndOverScrollEvents = 74, // if EXPERIMENTAL
  MinEnsured$Intl$$RelativeTimeFormat = 74, // even if LEGACY
  // the 4 below are even if EXPERIMENTAL or LEGACY
  MinMediaQuery$PrefersReducedMotion = 74,
  // https://chromium.googlesource.com/chromium/src/+/5e84b7a819637ed4dd8f9c4d11288127663c8267
  MinBlockAutoFocusingInCrossOriginFrame = 75,
  MinAccessKeyCausesFocus = 75,
  FakeUAMajorWhenFreezeUserAgent = 75,
  MinMediaQuery$PrefersColorScheme = 76,
  MinEnsured$Clipboard$$write$and$ClipboardItem = 76, // before 76, exist if EXPERIMENTAL
  // https://bugs.chromium.org/p/chromium/issues/detail?id=877132
  MinRuntimeFlag$UpdateHoverAtBeginFrame = 77, // #update-hover-at-begin-frame is enabled by default
  MinChromeFavicon2 = 77, // tested on 77.0.3865.90, chrome://favicon2/ is forbidden to use on extension pages
  MinScrollEndForInstantScrolling = 78, // if EXPERIMENTAL
  MinMaybePointerEventForRealClick = 79, // if EXPERIMENTAL
  // https://groups.google.com/a/chromium.org/forum/#!msg/blink-dev/h-JwMiPUnuU/sl79aLoLBQAJ
  // https://www.chromestatus.com/features/4507242028072960
  MinNoShadowDOMv0 = 80,
  Min$CrossOriginIsolation$Flag = 80, // #cross-origin-isolation; will break Vomnibar; included by EXPERIMENTAL on C81
  MinSelectionTreatPunctuationsAsWords = 80, // even if EXPERIMENTAL
  // blank on C80, too simple on C81, usable since C83 and work as default since C85;
  // with a fresh user data on C85, the newtab is chrome-search://... , and chrome://new-tab-page/ since a second start
  MinChromeURL$NewTabPage = 80, // chrome://new-tab-page/ ; even if EXPERIMENTAL or LEGACY
  MinAltBackspaceWithShiftToUndoOrRedo = 81, // a-backspace: undo; a-s-~: redo; even if EXPERIMENTAL or LEGACY
  // https://github.com/philc/vimium/issues/3449#issuecomment-568248237
  FlagOutOfBlinkCorsMayCauseBug = 81,
  // #freeze-user-agent: https://www.chromestatus.com/features/5704553745874944
  FlagFreezeUserAgentGiveFakeUAMajor = 81, // FakeUAMajorWhenFreezeUserAgent
  /** @see #Min$CrossOriginIsolation$Flag */
  MinEnsuredCrossOriginEmbedderPolicy = 83, // https://www.chromestatus.com/features/5642721685405696
  // require special CSP; not applied to extension contexts; seems to begin from C73 if EXPERIMENTAL
  MinEnsuredTrustedTypes = 83, // https://www.chromestatus.com/features/5650088592408576
  MinMaybe$navigator$$userAgentData = 83, // if EXPERIMENTAL
  Only$navigator$$userAgentData$$$uaList = 83,
  // #strict-origin-isolation; prevent LinkHints from getting child coreHints
  MinOriginIsolation = 84, // https://www.chromestatus.com/features/5683766104162304
  /** This fixes that {@see #Min$CrossOriginIsolation$Flag} would break Vomnibar */
  MinExtensionResourcesHaveCOEP = 84, // https://bugs.chromium.org/p/chromium/issues/detail?id=1085915
  MinCSS$appearance = 84, // even if EXPERIMENTAL or LEGACY
  MinMaybe$WeakRef = 84, // no `WeakRef` if LEGACY
  // 2->0.25/0.5; 5->0.04/0.2; 6->0.027778/0.166667
  MinBorderWidth$Ensure1$Or$Floor = 85, // even if EXPERIMENTAL or LEGACY
  // on C84 options must be `new IsInputPendingOptions()`
  // before C84 it logs a warning of "requires site-per-process" on Vimium C Options page
  MinMaybeUsableNavigator$scheduling$$isInputPending = 85, // if EXPERIMENTAL
  MinClipboardWriteHTML = 86,
  MinFileNameIsSelectableOnFilesPage = 86, // even if EXPERIMENTAL or LEGACY
  // if EXPERIMENTAL, since 79 there's also `navigator.scheduling.isFramePending()`
  MinEnsuredNavigator$scheduling$$isInputPending = 87, // even if LEGACY; since 74 if EXPERIMENTAL
  // the 2 below are even if EXPERIMENTAL or LEGACY
  MinNoExtraScrollbarWidthIfScrollStyleIsOverlay = 87, // replace MinExtraScrollbarWidthIfScrollStyleIsOverlay
  MinCSS$quotes$$auto = 87,
  MinMaybeScrollbarGutter = 88, // since 94 if not EXPERIMENTAL but even LEGACY
  Min$TargetIsBlank$Implies$Noopener = 88, // https://chromestatus.com/features/6140064063029248
  MinEnsuredCSS$is$selector = 88, // even if LEGACY; since C68 if EXPERIMENTAL
  MinEnsuredES$TopLevelAwait = 89, // even if LEGACY; since 84 if EXPERIMENTAL
  MinForcedColorsMode = 89, // even if EXPERIMENTAL or LEGACY; enable `(forced-colors: active|none)` and color schemes
  MinCaptureBeforeBubbleOnEventTarget = 89, // even if EXPERIMENTAL or LEGACY
  MinCSS$overflow$clip = 90, // even if EXPERIMENTAL or LEGACY
  MinOnWindows$Selection$$extend$stopWhenWhiteSpaceEnd = 90, // even if EXPERIMENTAL
  MinEnsuredNavigator$userAgentData = 90, // even if LEGACY; replace MinMaybe$navigator$$userAgentData
  MinESModulesInServiceWorker = 91,
  MinEnsured$string$$replaceAll = 91,
  MinEnsured$WeakRef = 92, // even if LEGACY
  MinEnsuredPointerEventForRealClick = 92, // if not EXPERIMENTAL else MinMaybePointerEventForRealClick; even if LEGACY
  BuildMinManifestV3 = 93,
  /** @todo: trace https://bugs.chromium.org/p/chromium/issues/detail?id=649162 */
  MinMaybeAutoFillInShadowDOM = 93, // if --enable-blink-features=AutofillShadowDOM
  MinNotPropagateBodyStyleIfContained = 96, // even if EXPERIMENTAL or LEGACY
  Min$structuredClone = 98, // even if EXPERIMENTAL or LEGACY
  MinEnsured$input$$showPicker = 99, // even if LEGACY; since 97 if EXPERIMENTAL
  MinScrollbarIncreasePadding = 99, // even if LEGACY; since 97 if EXPERIMENTAL
  MinEnsured$HTMLElement$$inert = 101, // even if EXPERIMENTAL
  MinNo$TimerType$$Fake = 999,
  assumedVer = 998,
}
declare const enum FirefoxBrowserVer {
  MinSupported = 63,
  // though it's under the control of `dom.webcomponents.shadowdom.enabled` (removed on FF65),
  // here still think it's "ensured" since FF63 - the code will be much simpler
  MinEnsuredShadowDOMV1 = 63, // also DocumentOrShadowRoot::getSelection
  MinMaybeUsable$navigator$$clipboard = 63, // under the control of `dom.events.asyncClipboard`
  MinMediaQuery$PrefersReducedMotion = 63,
  Min$Document$$FullscreenElement = 64, // under the control of `full-screen-api.unprefix.enabled` on about:config
  // Min$globalThis = 65, // should not export `globalThis` into the outside
  Min$find$NotReturnFakeTrueOnPlaceholderAndSoOn = 65,
  Min$Intl$$RelativeTimeFormat = 65,
  Min$globalThis = 65,
  MinMediaQuery$PrefersColorScheme = 67,
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1408996 and https://bugzilla.mozilla.org/show_bug.cgi?id=1514050
  MinExpandoObjectForSandboxWindowWrapperNotGetLost = 67, // https://github.com/philc/vimium/issues/2675
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1522083
  Min$TargetIsBlank$Implies$Noopener = 67, // treats `[rel]=null` as `[rel=noopener]`
  MinEnsuredES$DynamicImport = 67, // static import is ensured since FF60
  MinFollowSelectionColorOnInactiveFrame = 68,
  Min$visualViewport$OnAndroid = 68, // for desktop version: https://bugzilla.mozilla.org/show_bug.cgi?id=1551302
  Min$window$$focus$alwaysActivateTab = 68,
  MinNoKeygenElement = 69,
  MinUnprefixedUserSelect = 69,
  MinMaybeCSS$contain = 69,
  MinUserScriptsAPI = 69, // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts
  Min$queueMicrotask = 69,
  // but doesn't support code changes focus during input events when is composing
  // tested on Win 10 + MS PinYin and Ubuntu 18 + an inner PinYin IME
  MinContentEditableInShadowSupportIME = 69,
  Min$Blob$$arrayBuffer = 69,
  MinAboutDebuggingRuntimeThisFirefox = 69,
  Min$downloads$$download$acceptReferer = 70,
  Min$MathMLElement$Prototype = 71,
  MinCrossOriginResourcePolicy = 74, // not break Vomnibar
  Min$tabs$$goBack = 77,
  Min$permissions$$onAdded = 77,
  MinEnsuredCSSEnableContain = 77, // no `layout.css.contain.enabled`
  MinCSS$readOnly$selector = 78, // https://developer.mozilla.org/en-US/docs/Web/CSS/:read-only
  MinMediaQueryListenersWorkInBg = 78,
  MinEnsuredUnicodePropertyEscapesInRegExp = 78,
  MinLookBehindInRegexp = 78, // even if LEGACY
  MinMaybe$WeakRef = 79, // no `WeakRef` if javascript.options.weakrefs=false
  MinEnsuredCSS$is$selector = 81,
  MinMaybe$HTMLElement$$inert = 81, // if `html5.inert.enabled`
  MinInputSupportExecCommand = 89,
  MinContentEditableInShadowOfBodyRefuseShortcuts = 91,
  ESRPopupBlockerPassClicksFromExtensions = 91, // since 91.6
  Min$structuredClone = 94,
  MinBrowserDarkThemeSet$PrefersColorScheme = 95, // https://github.com/gdh1995/vimium-c/discussions/517
  // but refuse a `click#ctrl=false&shift=false` on `<a target=_blank>`: https://github.com/gdh1995/vimium-c/issues/616
  MinPopupBlockerPassComposedClicksFromExtensions = 96, // https://github.com/philc/vimium/issues/3964
  MinMaybe$navigator$$userAgentData = 101,
  // members of a Selection are never updated when an <input> gets focused, so no work-around
  Min$Selection$SupportTextBox = 999,
  None = 0,
  assumedVer = 999,
}

/** @todo: trace https://bugs.chromium.org/p/chromium/issues/detail?id=968651&can=2&q=reduced-motion%20change */
/** @todo: trace https://bugzilla.mozilla.org/show_bug.cgi?id=1587723 */
// MinMediaChangeEventsOnBackgroundPage = 1000,
