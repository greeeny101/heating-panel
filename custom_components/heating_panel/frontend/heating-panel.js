/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const rt = globalThis, kt = rt.ShadowRoot && (rt.ShadyCSS === void 0 || rt.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, _t = Symbol(), Ct = /* @__PURE__ */ new WeakMap();
let Zt = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== _t) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (kt && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = Ct.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && Ct.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const ce = (a) => new Zt(typeof a == "string" ? a : a + "", void 0, _t), te = (a, ...t) => {
  const e = a.length === 1 ? a[0] : t.reduce((s, i, n) => s + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + a[n + 1], a[0]);
  return new Zt(e, a, _t);
}, de = (a, t) => {
  if (kt) a.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), i = rt.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = e.cssText, a.appendChild(s);
  }
}, Mt = kt ? (a) => a : (a) => a instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return ce(e);
})(a) : a;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: ue, defineProperty: pe, getOwnPropertyDescriptor: me, getOwnPropertyNames: fe, getOwnPropertySymbols: ge, getPrototypeOf: ye } = Object, O = globalThis, Dt = O.trustedTypes, be = Dt ? Dt.emptyScript : "", we = O.reactiveElementPolyfillSupport, Q = (a, t) => a, dt = { toAttribute(a, t) {
  switch (t) {
    case Boolean:
      a = a ? be : null;
      break;
    case Object:
    case Array:
      a = a == null ? a : JSON.stringify(a);
  }
  return a;
}, fromAttribute(a, t) {
  let e = a;
  switch (t) {
    case Boolean:
      e = a !== null;
      break;
    case Number:
      e = a === null ? null : Number(a);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(a);
      } catch {
        e = null;
      }
  }
  return e;
} }, St = (a, t) => !ue(a, t), Ot = { attribute: !0, type: String, converter: dt, reflect: !1, useDefault: !1, hasChanged: St };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), O.litPropertyMetadata ?? (O.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let q = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = Ot) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(), i = this.getPropertyDescriptor(t, s, e);
      i !== void 0 && pe(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: i, set: n } = me(this.prototype, t) ?? { get() {
      return this[e];
    }, set(o) {
      this[e] = o;
    } };
    return { get: i, set(o) {
      const r = i?.call(this);
      n?.call(this, o), this.requestUpdate(t, r, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? Ot;
  }
  static _$Ei() {
    if (this.hasOwnProperty(Q("elementProperties"))) return;
    const t = ye(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(Q("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(Q("properties"))) {
      const e = this.properties, s = [...fe(e), ...ge(e)];
      for (const i of s) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s, i] of e) this.elementProperties.set(s, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const i = this._$Eu(e, s);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const i of s) e.unshift(Mt(i));
    } else t !== void 0 && e.push(Mt(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t) => t(this));
  }
  addController(t) {
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && t.hostConnected?.();
  }
  removeController(t) {
    this._$EO?.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s of e.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return de(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), this._$EO?.forEach((t) => t.hostConnected?.());
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t) => t.hostDisconnected?.());
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$ET(t, e) {
    const s = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, s);
    if (i !== void 0 && s.reflect === !0) {
      const n = (s.converter?.toAttribute !== void 0 ? s.converter : dt).toAttribute(e, s.type);
      this._$Em = t, n == null ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const s = this.constructor, i = s._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const n = s.getPropertyOptions(i), o = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : dt;
      this._$Em = i;
      const r = o.fromAttribute(e, n.type);
      this[i] = r ?? this._$Ej?.get(i) ?? r, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = !1, n) {
    if (t !== void 0) {
      const o = this.constructor;
      if (i === !1 && (n = this[t]), s ?? (s = o.getPropertyOptions(t)), !((s.hasChanged ?? St)(n, e) || s.useDefault && s.reflect && n === this._$Ej?.get(t) && !this.hasAttribute(o._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: i, wrapped: n }, o) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, o ?? e ?? this[t]), n !== !0 || o !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), i === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [i, n] of this._$Ep) this[i] = n;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [i, n] of s) {
        const { wrapped: o } = n, r = this[i];
        o !== !0 || this._$AL.has(i) || r === void 0 || this.C(i, void 0, n, r);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), this._$EO?.forEach((s) => s.hostUpdate?.()), this.update(e)) : this._$EM();
    } catch (s) {
      throw t = !1, this._$EM(), s;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
q.elementStyles = [], q.shadowRootOptions = { mode: "open" }, q[Q("elementProperties")] = /* @__PURE__ */ new Map(), q[Q("finalized")] = /* @__PURE__ */ new Map(), we?.({ ReactiveElement: q }), (O.reactiveElementVersions ?? (O.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const G = globalThis, Pt = (a) => a, ut = G.trustedTypes, zt = ut ? ut.createPolicy("lit-html", { createHTML: (a) => a }) : void 0, ee = "$lit$", D = `lit$${Math.random().toFixed(9).slice(2)}$`, se = "?" + D, ve = `<${se}>`, R = document, et = () => R.createComment(""), st = (a) => a === null || typeof a != "object" && typeof a != "function", Tt = Array.isArray, $e = (a) => Tt(a) || typeof a?.[Symbol.iterator] == "function", gt = `[ 	
\f\r]`, Y = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Nt = /-->/g, Ht = />/g, P = RegExp(`>|${gt}(?:([^\\s"'>=/]+)(${gt}*=${gt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Rt = /'/g, Bt = /"/g, ie = /^(?:script|style|textarea|title)$/i, ne = (a) => (t, ...e) => ({ _$litType$: a, strings: t, values: e }), h = ne(1), yt = ne(2), W = Symbol.for("lit-noChange"), c = Symbol.for("lit-nothing"), Ut = /* @__PURE__ */ new WeakMap(), H = R.createTreeWalker(R, 129);
function ae(a, t) {
  if (!Tt(a) || !a.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return zt !== void 0 ? zt.createHTML(t) : t;
}
const xe = (a, t) => {
  const e = a.length - 1, s = [];
  let i, n = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = Y;
  for (let r = 0; r < e; r++) {
    const l = a[r];
    let d, m, u = -1, f = 0;
    for (; f < l.length && (o.lastIndex = f, m = o.exec(l), m !== null); ) f = o.lastIndex, o === Y ? m[1] === "!--" ? o = Nt : m[1] !== void 0 ? o = Ht : m[2] !== void 0 ? (ie.test(m[2]) && (i = RegExp("</" + m[2], "g")), o = P) : m[3] !== void 0 && (o = P) : o === P ? m[0] === ">" ? (o = i ?? Y, u = -1) : m[1] === void 0 ? u = -2 : (u = o.lastIndex - m[2].length, d = m[1], o = m[3] === void 0 ? P : m[3] === '"' ? Bt : Rt) : o === Bt || o === Rt ? o = P : o === Nt || o === Ht ? o = Y : (o = P, i = void 0);
    const T = o === P && a[r + 1].startsWith("/>") ? " " : "";
    n += o === Y ? l + ve : u >= 0 ? (s.push(d), l.slice(0, u) + ee + l.slice(u) + D + T) : l + D + (u === -2 ? r : T);
  }
  return [ae(a, n + (a[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class it {
  constructor({ strings: t, _$litType$: e }, s) {
    let i;
    this.parts = [];
    let n = 0, o = 0;
    const r = t.length - 1, l = this.parts, [d, m] = xe(t, e);
    if (this.el = it.createElement(d, s), H.currentNode = this.el.content, e === 2 || e === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (i = H.nextNode()) !== null && l.length < r; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const u of i.getAttributeNames()) if (u.endsWith(ee)) {
          const f = m[o++], T = i.getAttribute(u).split(D), B = /([.?@])?(.*)/.exec(f);
          l.push({ type: 1, index: n, name: B[2], strings: T, ctor: B[1] === "." ? _e : B[1] === "?" ? Se : B[1] === "@" ? Te : ft }), i.removeAttribute(u);
        } else u.startsWith(D) && (l.push({ type: 6, index: n }), i.removeAttribute(u));
        if (ie.test(i.tagName)) {
          const u = i.textContent.split(D), f = u.length - 1;
          if (f > 0) {
            i.textContent = ut ? ut.emptyScript : "";
            for (let T = 0; T < f; T++) i.append(u[T], et()), H.nextNode(), l.push({ type: 2, index: ++n });
            i.append(u[f], et());
          }
        }
      } else if (i.nodeType === 8) if (i.data === se) l.push({ type: 2, index: n });
      else {
        let u = -1;
        for (; (u = i.data.indexOf(D, u + 1)) !== -1; ) l.push({ type: 7, index: n }), u += D.length - 1;
      }
      n++;
    }
  }
  static createElement(t, e) {
    const s = R.createElement("template");
    return s.innerHTML = t, s;
  }
}
function V(a, t, e = a, s) {
  if (t === W) return t;
  let i = s !== void 0 ? e._$Co?.[s] : e._$Cl;
  const n = st(t) ? void 0 : t._$litDirective$;
  return i?.constructor !== n && (i?._$AO?.(!1), n === void 0 ? i = void 0 : (i = new n(a), i._$AT(a, e, s)), s !== void 0 ? (e._$Co ?? (e._$Co = []))[s] = i : e._$Cl = i), i !== void 0 && (t = V(a, i._$AS(a, t.values), i, s)), t;
}
let ke = class {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: s } = this._$AD, i = (t?.creationScope ?? R).importNode(e, !0);
    H.currentNode = i;
    let n = H.nextNode(), o = 0, r = 0, l = s[0];
    for (; l !== void 0; ) {
      if (o === l.index) {
        let d;
        l.type === 2 ? d = new nt(n, n.nextSibling, this, t) : l.type === 1 ? d = new l.ctor(n, l.name, l.strings, this, t) : l.type === 6 && (d = new Ae(n, this, t)), this._$AV.push(d), l = s[++r];
      }
      o !== l?.index && (n = H.nextNode(), o++);
    }
    return H.currentNode = R, i;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
};
class nt {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, e, s, i) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = i?.isConnected ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && t?.nodeType === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = V(this, t, e), st(t) ? t === c || t == null || t === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : t !== this._$AH && t !== W && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : $e(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== c && st(this._$AH) ? this._$AA.nextSibling.data = t : this.T(R.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: e, _$litType$: s } = t, i = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = it.createElement(ae(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === i) this._$AH.p(e);
    else {
      const n = new ke(i, this), o = n.u(this.options);
      n.p(e), this.T(o), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = Ut.get(t.strings);
    return e === void 0 && Ut.set(t.strings, e = new it(t)), e;
  }
  k(t) {
    Tt(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, i = 0;
    for (const n of t) i === e.length ? e.push(s = new nt(this.O(et()), this.O(et()), this, this.options)) : s = e[i], s._$AI(n), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t !== this._$AB; ) {
      const s = Pt(t).nextSibling;
      Pt(t).remove(), t = s;
    }
  }
  setConnected(t) {
    this._$AM === void 0 && (this._$Cv = t, this._$AP?.(t));
  }
}
class ft {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, n) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = n, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = c;
  }
  _$AI(t, e = this, s, i) {
    const n = this.strings;
    let o = !1;
    if (n === void 0) t = V(this, t, e, 0), o = !st(t) || t !== this._$AH && t !== W, o && (this._$AH = t);
    else {
      const r = t;
      let l, d;
      for (t = n[0], l = 0; l < n.length - 1; l++) d = V(this, r[s + l], e, l), d === W && (d = this._$AH[l]), o || (o = !st(d) || d !== this._$AH[l]), d === c ? t = c : t !== c && (t += (d ?? "") + n[l + 1]), this._$AH[l] = d;
    }
    o && !i && this.j(t);
  }
  j(t) {
    t === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class _e extends ft {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === c ? void 0 : t;
  }
}
class Se extends ft {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== c);
  }
}
class Te extends ft {
  constructor(t, e, s, i, n) {
    super(t, e, s, i, n), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = V(this, t, e, 0) ?? c) === W) return;
    const s = this._$AH, i = t === c && s !== c || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, n = t !== c && (s === c || i);
    i && this.element.removeEventListener(this.name, this, s), n && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Ae {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    V(this, t);
  }
}
const Ee = G.litHtmlPolyfillSupport;
Ee?.(it, nt), (G.litHtmlVersions ?? (G.litHtmlVersions = [])).push("3.3.3");
const Ce = (a, t, e) => {
  const s = e?.renderBefore ?? t;
  let i = s._$litPart$;
  if (i === void 0) {
    const n = e?.renderBefore ?? null;
    s._$litPart$ = i = new nt(t.insertBefore(et(), n), n, void 0, e ?? {});
  }
  return i._$AI(a), i;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Z = globalThis;
class F extends q {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Ce(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return W;
  }
}
F._$litElement$ = !0, F.finalized = !0, Z.litElementHydrateSupport?.({ LitElement: F });
const Me = Z.litElementPolyfillSupport;
Me?.({ LitElement: F });
(Z.litElementVersions ?? (Z.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const De = { attribute: !0, type: String, converter: dt, reflect: !1, hasChanged: St }, Oe = (a = De, t, e) => {
  const { kind: s, metadata: i } = e;
  let n = globalThis.litPropertyMetadata.get(i);
  if (n === void 0 && globalThis.litPropertyMetadata.set(i, n = /* @__PURE__ */ new Map()), s === "setter" && ((a = Object.create(a)).wrapped = !0), n.set(e.name, a), s === "accessor") {
    const { name: o } = e;
    return { set(r) {
      const l = t.get.call(this);
      t.set.call(this, r), this.requestUpdate(o, l, a, !0, r);
    }, init(r) {
      return r !== void 0 && this.C(o, void 0, a, r), r;
    } };
  }
  if (s === "setter") {
    const { name: o } = e;
    return function(r) {
      const l = this[o];
      t.call(this, r), this.requestUpdate(o, l, a, !0, r);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function $(a) {
  return (t, e) => typeof e == "object" ? Oe(a, t, e) : ((s, i, n) => {
    const o = i.hasOwnProperty(n);
    return i.constructor.createProperty(n, s), o ? Object.getOwnPropertyDescriptor(i, n) : void 0;
  })(a, t, e);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function b(a) {
  return $({ ...a, state: !0, attribute: !1 });
}
var Pe = Object.defineProperty, _ = (a, t, e, s) => {
  for (var i = void 0, n = a.length - 1, o; n >= 0; n--)
    (o = a[n]) && (i = o(t, e, i) || i);
  return i && Pe(t, e, i), i;
};
const z = 135, M = 270, j = 120, pt = 100, lt = (a, t = 0, e = 1) => Math.min(e, Math.max(t, a)), mt = (a, t = pt) => {
  const e = a * Math.PI / 180;
  return { x: j + t * Math.cos(e), y: j + t * Math.sin(e) };
}, Lt = (a, t) => {
  const e = mt(a), s = mt(t), i = t - a > 180 ? 1 : 0;
  return `M ${e.x.toFixed(2)} ${e.y.toFixed(2)} A ${pt} ${pt} 0 ${i} 1 ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
}, w = (a) => `${Number.isInteger(a) ? a.toFixed(0) : a.toFixed(1)}°`, ze = (a) => Math.round(lt((a - 15) / 4) * 100);
function $t(a) {
  const t = ze(a);
  return t <= 50 ? `color-mix(in oklab, var(--mild) ${t * 2}%, var(--cool))` : `color-mix(in oklab, var(--warm) ${(t - 50) * 2}%, var(--mild))`;
}
const Ne = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, He = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, At = class At extends F {
  constructor() {
    super(...arguments), this.min = 5, this.max = 32, this.step = 0.5, this.target = null, this.current = null, this.off = !1, this.active = !1, this.readonly = !1, this.label = "", this.note = "", this.attention = !1, this.pending = null, this.dragging = !1, this.onPointerDown = (t) => {
      if (!this.interactive) return;
      const e = t.currentTarget.getBoundingClientRect(), s = (t.clientX - e.left) / e.width * 240 - j, i = (t.clientY - e.top) / e.height * 240 - j;
      if (Math.abs(Math.hypot(s, i) - pt) > 28) return;
      t.currentTarget.setPointerCapture(t.pointerId), this.dragging = !0;
      const n = this.valueAt(t);
      n !== null && this.choose(n);
    }, this.onPointerMove = (t) => {
      if (!this.dragging) return;
      const e = this.valueAt(t);
      e !== null && this.choose(e);
    }, this.onPointerUp = () => {
      this.dragging && (this.dragging = !1, this.commitTimer = window.setTimeout(() => this.commit(), 600));
    }, this.onKey = (t) => {
      if (t.key === "ArrowUp" || t.key === "ArrowRight") this.nudge(1);
      else if (t.key === "ArrowDown" || t.key === "ArrowLeft") this.nudge(-1);
      else return;
      t.preventDefault();
    };
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.clearTimeout(this.commitTimer), window.clearTimeout(this.settleTimer), this.dragging = !1;
  }
  willUpdate(t) {
    t.has("target") && this.pending !== null && this.target === this.pending && (this.pending = null);
  }
  get interactive() {
    return !this.readonly && !this.off && this.target !== null;
  }
  snap(t) {
    return lt(Math.round(t / this.step) * this.step, this.min, this.max);
  }
  choose(t) {
    this.pending = this.snap(t), window.clearTimeout(this.commitTimer), !this.dragging && (this.commitTimer = window.setTimeout(() => this.commit(), 600));
  }
  commit() {
    if (this.pending === null || this.pending === this.target) {
      this.pending = null;
      return;
    }
    this.dispatchEvent(
      new CustomEvent("dial-change", { detail: { value: this.pending }, bubbles: !0, composed: !0 })
    ), window.clearTimeout(this.settleTimer), this.settleTimer = window.setTimeout(() => this.pending = null, 15e3);
  }
  nudge(t) {
    this.interactive && this.choose((this.pending ?? this.target ?? this.min) + t * this.step);
  }
  valueAt(t) {
    const e = t.currentTarget.getBoundingClientRect(), s = (t.clientX - e.left) / e.width * 240 - j, i = (t.clientY - e.top) / e.height * 240 - j;
    let n = (Math.atan2(i, s) * 180 / Math.PI - z + 720) % 360;
    return n > M && (n = n < M + (360 - M) / 2 ? M : 0), this.min + n / M * (this.max - this.min);
  }
  render() {
    const t = this.pending ?? this.target, e = t === null || this.off ? null : lt((t - this.min) / (this.max - this.min)), s = e === null ? null : z + M * e, i = s === null ? null : mt(s), n = this.current === null ? null : mt(z + M * lt((this.current - this.min) / (this.max - this.min))), o = this.active ? "var(--porch)" : $t(t ?? this.min);
    return h`
      <div class="dial ${this.active ? "active" : ""}" style=${`--tone: ${o}`}>
        <svg
          viewBox="0 0 240 240"
          class=${this.interactive ? "interactive" : ""}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
        >
          <path class="track" d=${Lt(z, z + M)} />
          ${s !== null && s - z > 0.5 ? yt`<path class="level" d=${Lt(z, s)} />` : c}
          ${n ? yt`<circle class="room" cx=${n.x} cy=${n.y} r="4" />` : c}
          ${i ? yt`<circle
                class="thumb"
                cx=${i.x}
                cy=${i.y}
                r="11"
                role="slider"
                tabindex=${this.interactive ? "0" : "-1"}
                aria-label="Target temperature"
                aria-valuemin=${this.min}
                aria-valuemax=${this.max}
                aria-valuenow=${t ?? c}
                aria-readonly=${this.interactive ? "false" : "true"}
                @keydown=${this.onKey}
              />` : c}
        </svg>
        <div class="center" aria-live="polite">
          <div class="label">${this.label}</div>
          <div class="value">${this.off ? "Off" : t === null ? "–" : w(t)}</div>
          <div class="room-text">${this.current === null ? "" : `Room ${w(this.current)}`}</div>
          <div class="note ${this.attention ? "attention" : ""}">${this.note}</div>
        </div>
        <button
          class="step minus"
          ?disabled=${!this.interactive}
          title="Lower"
          aria-label="Lower the temperature"
          @click=${() => this.nudge(-1)}
        >
          ${Ne}
        </button>
        <button
          class="step plus"
          ?disabled=${!this.interactive}
          title="Raise"
          aria-label="Raise the temperature"
          @click=${() => this.nudge(1)}
        >
          ${He}
        </button>
      </div>
    `;
  }
};
At.styles = te`
    :host {
      display: block;
    }
    .dial {
      position: relative;
      width: min(100%, 320px);
      aspect-ratio: 1;
      margin: 0 auto;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    svg.interactive {
      touch-action: none;
    }
    .track,
    .level {
      fill: none;
      stroke-width: 14;
      stroke-linecap: round;
    }
    .track {
      stroke: var(--slate);
    }
    .level {
      stroke: var(--tone);
    }
    .active .level {
      filter: drop-shadow(0 0 6px color-mix(in srgb, var(--porch) 55%, transparent));
    }
    .room {
      fill: var(--mist);
    }
    .thumb {
      fill: var(--mist);
      stroke: var(--dusk);
      stroke-width: 3;
      outline: none;
    }
    .interactive .thumb {
      cursor: grab;
    }
    .thumb:focus-visible {
      stroke: var(--porch);
    }
    .center {
      position: absolute;
      inset: 18% 18% 24%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
      pointer-events: none;
    }
    .label {
      min-height: 1.3em;
      color: var(--haze);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .value {
      font-size: clamp(3rem, 15vw, 4.25rem);
      font-weight: 600;
      line-height: 1.05;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .room-text {
      min-height: 1.3em;
      color: var(--haze);
      font-size: 0.9375rem;
      font-variant-numeric: tabular-nums;
    }
    .note {
      min-height: 1.3em;
      margin-top: 4px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .note.attention {
      color: var(--porch);
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 3px solid var(--porch);
      outline-offset: 3px;
    }
    .step {
      position: absolute;
      top: calc(89% - 28px);
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--slate);
    }
    .step svg {
      width: 24px;
      height: 24px;
    }
    .step:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .minus {
      left: calc(37.5% - 28px);
    }
    .plus {
      left: calc(62.5% - 28px);
    }
    @media (prefers-reduced-motion: no-preference) {
      .level,
      .thumb {
        transition: stroke 0.2s;
      }
    }
  `;
let v = At;
_([
  $({ type: Number })
], v.prototype, "min");
_([
  $({ type: Number })
], v.prototype, "max");
_([
  $({ type: Number })
], v.prototype, "step");
_([
  $({ attribute: !1 })
], v.prototype, "target");
_([
  $({ attribute: !1 })
], v.prototype, "current");
_([
  $({ type: Boolean })
], v.prototype, "off");
_([
  $({ type: Boolean })
], v.prototype, "active");
_([
  $({ type: Boolean })
], v.prototype, "readonly");
_([
  $()
], v.prototype, "label");
_([
  $()
], v.prototype, "note");
_([
  $({ type: Boolean })
], v.prototype, "attention");
_([
  b()
], v.prototype, "pending");
customElements.get("heating-dial") || customElements.define("heating-dial", v);
const p = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], E = (a) => a <= 1, C = (a) => (a.getDay() + 6) % 7, at = (a) => [...a].sort((t, e) => t.time - e.time);
function S(a) {
  const t = [];
  for (const e of at(a))
    (!t.length || t[t.length - 1].setpoint !== e.setpoint) && t.push(e);
  return t;
}
function oe(a, t) {
  const e = a[p[(t + 6) % 7]];
  if (!e?.length) return null;
  const s = at(e);
  return s[s.length - 1].setpoint;
}
function Re(a, t) {
  const e = a[p[t]];
  if (!e) return [];
  const s = [];
  let i = 0, n = oe(a, t);
  for (const o of S(e))
    o.time > i && s.push({ start: i, end: o.time, setpoint: n }), i = o.time, n = o.setpoint;
  return s.push({ start: i, end: 24 * 60, setpoint: n }), s.reduce((o, r) => {
    const l = o[o.length - 1];
    return l && l.setpoint === r.setpoint ? l.end = r.end : o.push({ ...r }), o;
  }, []);
}
function re(a, t, e) {
  const s = a[p[t]];
  if (!s) return null;
  let i = oe(a, t);
  for (const n of at(s)) {
    if (n.time > e) break;
    i = n.setpoint;
  }
  return i;
}
function Be(a, t) {
  const e = C(t), s = t.getHours() * 60 + t.getMinutes(), i = re(a, e, s);
  if (i === null) return null;
  for (let n = 0; n < 7; n++) {
    const o = a[p[(e + n) % 7]];
    if (!o) return null;
    for (const r of at(o))
      if (!(n === 0 && r.time <= s) && r.setpoint !== i)
        return { dayOffset: n, time: r.time, setpoint: r.setpoint };
  }
  return null;
}
const tt = 6;
function le(a) {
  const t = S(a);
  for (let e = t.length - 1; e >= 0 && t.length < tt; e--) {
    const s = t[e].time + 15, i = t[e + 1]?.time ?? 24 * 60;
    s < i && t.splice(e + 1, 0, { time: s, setpoint: t[e].setpoint });
  }
  for (; t.length && t.length < tt; ) {
    const e = t.findIndex((s, i) => (t[i + 1]?.time ?? 1440) - s.time >= 30);
    if (e < 0) break;
    t.splice(e + 1, 0, { time: t[e].time + 15, setpoint: t[e].setpoint });
  }
  return t;
}
function It(a, t) {
  const e = C(t), s = t.getHours() * 60 + t.getMinutes();
  for (let i = 0; i < 7; i++) {
    const n = a[p[(e + i) % 7]];
    if (!n) return null;
    const o = at(n).find((r) => i > 0 || r.time > s);
    if (o) return { dayOffset: i, time: o.time };
  }
  return null;
}
const Ue = (a) => `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`, xt = (a = [], t = []) => JSON.stringify(S(a)) === JSON.stringify(S(t)), Le = new Intl.DateTimeFormat(void 0, { hour: "2-digit", minute: "2-digit" }), N = (a) => Le.format(new Date(2e3, 0, 1, Math.floor(a / 60), a % 60)), Ie = new Intl.DateTimeFormat(void 0, { weekday: "short" }), qe = new Intl.DateTimeFormat(void 0, { weekday: "long" }), J = p.map((a, t) => Ie.format(new Date(2024, 0, 1 + t))), A = p.map((a, t) => qe.format(new Date(2024, 0, 1 + t))), ht = 65535, ot = 1, he = 65534, ct = 16, je = 360, Fe = 3, U = (a) => new Promise((t) => window.setTimeout(t, a)), We = (a) => a instanceof Error ? a.message : String(a?.message ?? a), K = "If a holiday is set on the remote (plane icon), cancel it there first.";
class x extends Error {
}
const Ve = {
  off: "Off",
  schedule: "Schedule",
  manual: "Manual",
  override: "a temporary change",
  boost: "Boost",
  away: "Away",
  unknown: "an unknown mode"
}, qt = [
  "temperature_setpoint_hold_duration",
  "temperature_setpoint_hold",
  "system_mode",
  "running_state",
  "occupied_heating_setpoint",
  "local_temperature"
];
function jt(a) {
  switch (a.system_mode) {
    case "off":
      return "off";
    case "emergency_heating":
      return "boost";
    case "heat": {
      if (a.temperature_setpoint_hold === !1) return "schedule";
      const t = a.temperature_setpoint_hold_duration;
      return a.temperature_setpoint_hold === !0 && typeof t == "number" ? t === ht ? "manual" : "schedule" : "unknown";
    }
    default:
      return "unknown";
  }
}
class Ye {
  /**
   * With `stateEntity`, the receiver's reports come from an MQTT sensor carrying them as attributes,
   * which any Home Assistant user may follow. Without it, the topic is watched directly, which
   * Home Assistant only allows administrators to do.
   */
  constructor(t, e, s, i) {
    this.getHass = t, this.topic = e, this.changed = s, this.stateEntity = i, this.report = {}, this.status = "connecting", this.errorText = "", this.week = {}, this.scheduleState = "idle", this.retainedCommand = !1, this.busy = !1, this.unexpected = "", this.holdEnd = null, this.waiters = [], this.unsubs = [], this.stopped = !1, this.entityAttrs = {}, this.onState = (n) => {
      let o;
      try {
        o = JSON.parse(n.payload);
      } catch {
        return;
      }
      o && typeof o == "object" && this.onReport(o);
    }, this.onEntity = (n) => {
      const o = this.stateEntity, r = n.a?.[o];
      r && (this.entityAttrs = { ...r.a ?? {} }, this.onReport(this.entityAttrs, !1));
      const l = n.c?.[o];
      if (l) {
        const d = l["+"]?.a;
        d && (this.entityAttrs = { ...this.entityAttrs, ...d });
        for (const m of l["-"]?.a ?? []) delete this.entityAttrs[m];
        this.onReport(this.entityAttrs);
      }
    }, this.onSet = (n) => {
      n.retain && n.payload.trim() && (this.retainedCommand = !0, this.changed());
    };
  }
  async start() {
    this.stopped = !1, this.status = "connecting";
    try {
      if (this.stateEntity) {
        if (!this.getHass().states[this.stateEntity]) {
          this.status = "no-entity", this.changed();
          return;
        }
        await this.subscribe({ type: "subscribe_entities", entity_ids: [this.stateEntity] }, this.onEntity);
      } else
        await this.subscribe({ type: "mqtt/subscribe", topic: this.topic }, this.onState), await this.subscribe({ type: "mqtt/subscribe", topic: `${this.topic}/set` }, this.onSet);
    } catch (t) {
      if (this.stopped) return;
      const { code: e, message: s } = t ?? {};
      this.status = e === "unauthorized" ? "no-access" : e === "unknown_command" ? "no-mqtt" : "error", this.errorText = s ?? String(t), this.changed();
      return;
    }
    this.stopped || (this.silentTimer = window.setTimeout(() => {
      this.status === "connecting" && (this.status = "silent", this.changed());
    }, 1e4), this.requestState(), this.requestSchedule());
  }
  stop() {
    this.stopped = !0;
    for (const t of this.waiters) t({});
    this.waiters = [], window.clearTimeout(this.silentTimer), window.clearTimeout(this.scheduleTimer);
    for (const t of this.unsubs) t().catch(() => {
    });
    this.unsubs = [];
  }
  requestState() {
    this.get(Object.fromEntries(qt.map((t) => [t, ""])));
  }
  /** The receiver answers with one message per day. */
  requestSchedule() {
    this.scheduleState = "loading", window.clearTimeout(this.scheduleTimer), this.scheduleTimer = window.setTimeout(() => {
      this.scheduleState === "loading" && (this.scheduleState = "partial", this.changed());
    }, 2e4), this.get({ weekly_schedule: "" }), this.changed();
  }
  /** What the schedule says right now, or null if it isn't loaded. */
  get scheduledNow() {
    const t = /* @__PURE__ */ new Date();
    return re(this.week, C(t), t.getHours() * 60 + t.getMinutes());
  }
  /**
   * TPI while it's controlling the boiler, or null. It's found through the integration's heating mode sensor
   * for this receiver, which any user may read.
   */
  get tpi() {
    const t = this.getHass().states;
    for (const e in t) {
      const s = t[e].attributes;
      if (!(!e.startsWith("sensor.") || s.topic !== this.topic || !("tpi_active" in s)))
        return s.tpi_active !== !0 || typeof s.tpi_target != "number" ? null : {
          target: s.tpi_target,
          setpoint: typeof s.tpi_setpoint == "number" ? s.tpi_setpoint : null,
          demand: typeof s.tpi_demand == "number" ? s.tpi_demand : 0
        };
    }
    return null;
  }
  /**
   * The temperature being aimed for. With TPI on, the receiver's setpoint is nudged either side of the
   * target, so TPI's target is shown instead, as long as the receiver has what TPI wrote.
   */
  get target() {
    const t = this.report.occupied_heating_setpoint, e = this.tpi;
    return e && jt(this.report) === "schedule" && (t === e.setpoint || t === e.target) ? e.target : t;
  }
  get mode() {
    const t = jt(this.report), e = this.scheduledNow, s = this.target;
    if (t === "schedule" && e !== null && s !== void 0 && s !== e) return "override";
    if (t === "boost") {
      const i = this.minutesLeft;
      if (s !== void 0 && s <= ct || i !== null && i > je) return "away";
    }
    return t;
  }
  /** Minutes left on a boost or temporary change, as the receiver counts; null if there's no end time or no hold. */
  get minutesLeft() {
    const t = this.holdEnds;
    return t === null ? null : Math.max(0, Math.ceil((t - Date.now()) / 6e4) - 1);
  }
  /**
   * When the hold ends (ms), or null. The receiver's count drops a minute within seconds of starting and
   * reaches 0 a minute before the end, so the end is a minute after the count runs out.
   */
  get holdEnds() {
    const t = this.report.temperature_setpoint_hold_duration;
    return t === void 0 || t === ht || !this.report.temperature_setpoint_hold ? null : this.holdEnd;
  }
  get scheduleDays() {
    return p.filter((t) => this.week[t]).length;
  }
  // ---- Commands. Sequences and why: docs/receiver-protocol.md ----
  /** Back to the receiver's own schedule. */
  toSchedule() {
    return this.run("schedule", async () => {
      if (await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }), !await this.until("temperature_setpoint_hold", (t) => t === !1))
        throw new x(`The receiver didn't go back to its schedule. ${K}`);
    });
  }
  /**
   * Boost for `minutes` at `temp`, as one message in zigbee2mqtt's documented order. The receiver takes
   * the length only if it's already written when the hold switches from off to on, so the boost has to
   * start with the hold off (from Schedule or Off). Any step that doesn't take sends the receiver back
   * to its schedule, so a boost can never be left without an end. See docs/receiver-protocol.md.
   */
  boost(t, e) {
    return this.timedBoost("boost", t, e);
  }
  /**
   * Away until `until`: a boost at a low temperature for the minutes until then. The receiver counts it
   * down and goes back to its schedule by itself, without the remote or Home Assistant.
   */
  away(t, e) {
    const s = () => Math.min(he, Math.round((t.getTime() - Date.now()) / 6e4));
    return s() < 1 ? Promise.reject(new x("Pick a time in the future.")) : this.timedBoost("away", s, e);
  }
  /**
   * The receiver sometimes takes the mode but not the length: it keeps "no end" (65534/65535), or 0 so the
   * boost ends at once (07:32 and 07:35 on 10 Oct; 5 of 7 tries took). So a try that doesn't take is
   * undone, back to Schedule, and sent again. `minutes` is asked afresh each try, so Away still ends on time.
   */
  timedBoost(t, e, s) {
    const i = typeof e == "number" ? () => e : e;
    return this.run(t, async () => {
      if (this.report.temperature_setpoint_hold !== !1) {
        if (await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }), !await this.until("temperature_setpoint_hold", (n) => n === !1))
          throw new x(`The receiver didn't get ready. ${K}`);
        await U(1e3);
      }
      for (let n = 1; ; n++) {
        const o = i();
        try {
          if (await this.set({
            system_mode: "emergency_heating",
            temperature_setpoint_hold_duration: o,
            temperature_setpoint_hold: !0,
            occupied_heating_setpoint: s
          }), !await this.until("system_mode", (r) => r === "emergency_heating"))
            throw new x("The receiver didn't switch to boost.");
          if (!await this.until("temperature_setpoint_hold_duration", (r) => typeof r == "number" && r >= 1 && r <= o, 3))
            throw new x("The receiver didn't take the boost length.");
          await this.until("occupied_heating_setpoint", (r) => r === s, 2) || await this.setpoint(s);
          return;
        } catch (r) {
          await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }).catch(() => {
          });
          const l = await this.until("temperature_setpoint_hold", (d) => d === !1);
          if (l && n < Fe) {
            await U(2e3);
            continue;
          }
          throw new x(
            `${We(r)} ${l ? "The heating is back on its schedule." : "Check the remote: it may still be boosting."}`
          );
        }
      }
    });
  }
  /** Hold with no end, then the temperature on its own (the hold resets it to the schedule's). */
  manual(t) {
    return this.run("manual", async () => {
      if (await this.set({ system_mode: "heat", temperature_setpoint_hold: !0, temperature_setpoint_hold_duration: ht }), !await this.until("temperature_setpoint_hold", (e) => e === !0))
        throw new x(`The receiver didn't switch to manual. ${K}`);
      await U(1e3), await this.setpoint(t);
    });
  }
  /**
   * Off, as the remote does it (17:20): mode off, hold off **and** the temperature set to 1, the
   * receiver's frost / "off" value (the remote's snowflake). Mode off alone left a Manual hold running
   * at its old temperature, and hold off alone left that temperature, so the receiver kept heating to it.
   */
  off() {
    return this.run("off", async () => {
      if (await this.set({ system_mode: "off", temperature_setpoint_hold: !1, occupied_heating_setpoint: ot }), !await this.until("system_mode", (t) => t === "off"))
        throw new x(`The receiver didn't switch off. ${K}`);
      if (!await this.until("temperature_setpoint_hold", (t) => t === !1))
        throw new x(`The receiver is off but still holding a temperature, so it may keep heating. ${K}`);
      if (!await this.until("occupied_heating_setpoint", (t) => t === ot, 2)) {
        await this.set({ occupied_heating_setpoint: ot });
        const t = await this.readOne("occupied_heating_setpoint");
        if (t !== ot)
          throw new x(`The receiver is off but still set to ${t}°, so it may keep heating. Turn it off on the remote.`);
      }
    });
  }
  /**
   * Writes the given days to the receiver (days with the same settings go in one message), then reads
   * the whole schedule back to check every saved day.
   */
  saveSchedule(t, e) {
    return this.run(this.mode, async () => {
      const s = /* @__PURE__ */ new Map();
      for (const n of e) {
        const o = JSON.stringify(t[n] ?? []);
        s.set(o, [...s.get(o) ?? [], n]);
      }
      for (const [n, o] of s) {
        const r = le(JSON.parse(n)).map((l) => ({ heatSetpoint: l.setpoint, transitionTime: Ue(l.time) }));
        await this.set({ weekly_schedule: { dayofweek: o, transitions: r } });
      }
      this.week = {}, this.requestSchedule();
      for (let n = 0; n < 50 && this.scheduleState === "loading"; n++) await U(500);
      const i = e.filter((n) => !this.week[n] || !xt(this.week[n], t[n]));
      if (i.length)
        throw new x(
          `The receiver didn't confirm ${i.length === e.length ? "the new schedule" : `${i.length} of the days`}. Open the schedule again to see what it has.`
        );
    });
  }
  /**
   * Change the temperature. In Manual and Boost it stays; on Schedule it's a temporary change,
   * just as the remote's dial does, lasting until the next schedule slot.
   */
  setTarget(t) {
    const e = this.mode;
    if (e === "off" || e === "unknown")
      return Promise.reject(new x("Choose Schedule, Manual or Boost first."));
    const s = e === "manual" || e === "boost" || e === "away" ? e : t === this.scheduledNow ? "schedule" : "override";
    return this.run(s, () => this.setpoint(t));
  }
  async setpoint(t) {
    for (let e = 0; e < 2; e++)
      if (await this.set({ occupied_heating_setpoint: t }), await this.until("occupied_heating_setpoint", (s) => s === t, 3)) return;
    throw new x("The receiver didn't take the new temperature.");
  }
  /** One command at a time; afterwards, watch for five minutes that the receiver stays put. */
  async run(t, e) {
    if (this.busy) throw new x("Still sending the last change. Try again in a moment.");
    this.busy = !0, this.unexpected = "", this.expect = void 0, this.changed(), this.tellBusy(!0);
    try {
      await e(), this.expect = { mode: t, until: Date.now() + 5 * 6e4 };
    } finally {
      this.busy = !1, this.changed(), this.tellBusy(!1);
    }
  }
  /**
   * Tells the heating_panel integration a change is starting or has finished, so its heating mode sensor
   * (and the dashboard card) skips the steps on the way, as the panel does. Without the integration, or with
   * an older one, there's nothing to tell; it never holds up the change.
   */
  tellBusy(t) {
    this.getHass().callService("heating_panel", "busy", { topic: this.topic, busy: t }, void 0, !1).catch(() => {
    });
  }
  /**
   * Sends a write, then waits for zigbee2mqtt's echoes of it to pass: an echo shows the value
   * written, not what the receiver kept (it may reset it a moment later).
   */
  async set(t) {
    await this.send("set", t), await U(1500);
  }
  /**
   * Publishes to the receiver's /set or /get topic. Since Home Assistant 2026.10 only administrators may
   * call mqtt.publish, so this goes through the heating_panel integration's service when it's installed.
   */
  async send(t, e) {
    const s = this.getHass();
    try {
      return await s.callService("heating_panel", "send", { topic: this.topic, command: t, payload: e }, void 0, !1);
    } catch (i) {
      if (i?.code !== "not_found") throw i;
    }
    return s.callService("mqtt", "publish", { topic: `${this.topic}/${t}`, payload: JSON.stringify(e) });
  }
  /**
   * Reads one attribute from the receiver. zigbee2mqtt publishes after each attribute it reads,
   * filling the rest from its cache, so only the attribute asked for is trustworthy.
   */
  readOne(t) {
    return new Promise((e) => {
      const s = (n) => {
        window.clearTimeout(i), e(n[t]);
      }, i = window.setTimeout(() => {
        this.waiters = this.waiters.filter((n) => n !== s), e(void 0);
      }, 8e3);
      this.waiters.push(s), this.get({ [t]: "" });
    });
  }
  async until(t, e, s = 5) {
    for (let i = 0; i < s && !this.stopped; i++) {
      if (e(await this.readOne(t))) return !0;
      await U(1500);
    }
    return !1;
  }
  async subscribe(t, e) {
    const s = await this.getHass().connection.subscribeMessage(e, t);
    this.stopped ? s().catch(() => {
    }) : this.unsubs.push(s);
  }
  get(t) {
    this.send("get", t).catch((e) => {
      this.status = e?.code === "unauthorized" ? "no-integration" : "error", this.errorText = e?.message ?? String(e), this.changed();
    });
  }
  onReport(t, e = !0) {
    const s = this.report;
    for (const r of qt) r in t && (s[r] = t[r]);
    if ("temperature_setpoint_hold_duration" in t || "temperature_setpoint_hold" in t) {
      const r = this.report.temperature_setpoint_hold_duration;
      if (!this.report.temperature_setpoint_hold || r === void 0 || r === ht) this.holdEnd = null;
      else {
        const l = Date.now() + (r + 1) * 6e4;
        this.holdEnd = this.holdEnd === null ? l : Math.min(this.holdEnd, l);
      }
    }
    if (!e) {
      this.changed();
      return;
    }
    window.clearTimeout(this.silentTimer), this.status = "live";
    const i = this.waiters;
    this.waiters = [];
    for (const r of i) r(t);
    const n = this.mode;
    this.expect && !this.busy && n !== "unknown" && n !== this.expect.mode && (Date.now() < this.expect.until && (this.unexpected = `The receiver changed to ${Ve[n]} shortly after your change. If nobody used the remote, it didn't keep the setting.`), this.expect = void 0);
    const o = t.weekly_schedule;
    if (o?.days && Array.isArray(o.transitions)) {
      const r = o.transitions.map((l) => ({ time: l.time, setpoint: l.heating_setpoint }));
      for (const l of o.days) p.includes(l) && (this.week[l] = r);
      this.week = { ...this.week }, this.scheduleState !== "done" && this.scheduleDays === p.length && (this.scheduleState = "done", window.clearTimeout(this.scheduleTimer));
    }
    this.changed();
  }
}
function Je(a) {
  const t = (e, s) => ({
    pct: e,
    source: s,
    noHeat: e !== null && e > 0 && !a.boilerHeating
  });
  return a.hasSensor ? t(a.sensor, "sensor") : a.state === "off" ? t(0, a.action === void 0 ? "estimated" : "reported") : a.action === "heating" ? t(100, "reported") : a.action === "idle" || a.action === "off" ? t(0, "reported") : a.boilerHeating ? a.current === null || a.target === null ? t(null, "estimated") : t(a.current < a.target ? 100 : 0, "estimated") : t(0, "estimated");
}
function Ke(a) {
  if (a.pct === null) return "–";
  const t = a.source === "sensor" ? `${a.pct}% open` : a.pct > 0 ? "Open" : "Closed";
  return a.noHeat ? `${t} · boiler off` : t;
}
function Ft(a) {
  if (a.pct === null) return "Valve position unknown";
  const t = a.pct > 0 ? "open" : "closed", e = a.source === "sensor" ? `Valve ${a.pct}% open` : a.source === "reported" ? `Valve ${t} (as the valve reports it; it doesn't say how far)` : `Valve ${t} (worked out from the temperatures; this valve doesn't report its position)`;
  return a.noHeat ? `${e}. The boiler isn't heating, so no heat is reaching this radiator.` : e;
}
var Xe = Object.defineProperty, y = (a, t, e, s) => {
  for (var i = void 0, n = a.length - 1, o; n >= 0; n--)
    (o = a[n]) && (i = o(t, e, i) || i);
  return i && Xe(t, e, i), i;
};
const bt = {
  minutes: { id: "input_number.heating_panel_boost_minutes", name: "Heating panel boost minutes", min: 5, max: 240, step: 5, unit: "min", icon: "mdi:timer-outline" },
  temperature: { id: "input_number.heating_panel_boost_temperature", name: "Heating panel boost temperature", min: 12, max: 32, step: 0.5, unit: "°C", icon: "mdi:thermometer" },
  away_temperature: { id: "input_number.heating_panel_away_temperature", name: "Heating panel away temperature", min: 5, max: 16, step: 0.5, unit: "°C", icon: "mdi:airplane" }
}, Wt = [15, 30, 45, 60, 90, 120], Qe = (a) => new Promise((t) => window.setTimeout(t, a)), Vt = 1, Yt = ["manual", "boost", "away", "schedule", "override"], Jt = 7, Kt = 28, wt = "heating-panel:schedule-backup", Ge = (a) => JSON.parse(JSON.stringify(a)), vt = {
  off: "Off",
  schedule: "Schedule",
  manual: "Manual",
  override: "Until next change",
  boost: "Boost",
  away: "Away",
  unknown: ""
}, k = (a) => typeof a == "number" && Number.isFinite(a) ? a : null, Ze = (a) => a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, " "), ts = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, Xt = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, es = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.2 1.6 1 2.6 2 3C11 9 11 6 12 3z" fill="currentColor" />
</svg>`, L = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, I = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, X = (a) => a < 60 ? `${a} min` : a % 60 ? `${Math.floor(a / 60)} h ${a % 60} min` : `${a / 60} h`, Qt = (a) => a instanceof Error ? a.message : String(a?.message ?? a), ss = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 7h9M19 7h1M4 17h3M13 17h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <circle cx="16" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="2" />
  <circle cx="10" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="2" />
</svg>`, Gt = h`<svg viewBox="0 0 24 24" aria-hidden="true" class="plane">
  <path d="M10.5 21l1.5-1 0-5 8 2.5V15l-8-5V4.5a1.5 1.5 0 0 0-3 0V10l-8 5v2.5L9 15v5l1.5 1z" fill="currentColor" transform="translate(1.5 0)" />
</svg>`, is = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
  <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <rect x="5.5" y="9.5" width="3" height="5" rx="0.5" fill="currentColor" />
</svg>`, Et = class Et extends F {
  constructor() {
    super(...arguments), this.narrow = !1, this.view = { kind: "main" }, this.kiosk = !1, this.scheduleDay = C(/* @__PURE__ */ new Date()), this.tick = 0, this.boostOpen = !1, this.boostMinutes = 15, this.boostTemp = 22, this.awayOpen = !1, this.awayDay = 0, this.awayTime = 18 * 60, this.awayTemp = 14, this.toast = "", this.toastError = !1, this.chosen = {}, this.draft = null, this.editing = null, this.copyDays = null, this.frozen = null, this.queuedTemp = null, this.started = !1, this.onVisibility = () => {
      document.hidden || this.link?.requestState();
    }, this.onKeyDown = (t) => {
      t.key === "Escape" && (this.boostOpen = !1, this.awayOpen = !1, this.editing = null, this.copyDays = null);
    }, this.startBoost = () => {
      const t = this.link;
      if (!t) return;
      const e = this.boostMinutes, s = this.boostTemp;
      this.boostOpen = !1, this.command(() => t.boost(e, s), `Boosting for ${X(e)}`, "boost", s);
    }, this.startAway = () => {
      const t = this.link;
      if (!t) return;
      const e = this.awayUntil, s = this.awayTemp;
      this.awayOpen = !1, this.command(() => t.away(e, s), `Away until ${this.dateText(e)}`, "away", s);
    }, this.endAway = () => {
      const t = this.link;
      t && (this.awayOpen = !1, this.command(() => t.toSchedule(), "Welcome back: on the schedule again", "schedule"));
    }, this.stopBoost = () => {
      const t = this.link;
      t && (this.boostOpen = !1, this.command(() => t.toSchedule(), "Boost stopped, back on the schedule", "schedule"));
    }, this.onLocationChanged = () => {
      this.started && this.applyUrl();
    }, this.back = () => {
      history.state?.heatingPanel ? history.back() : this.go({}, !0);
    }, this.tidySchedule = () => {
      const t = this.link;
      if (!t) return;
      const e = this.untidyDays, s = {};
      for (const i of e) s[i] = S(t.week[i]);
      this.command(
        () => t.saveSchedule(s, e),
        `Tidied ${e.length === 1 ? A[p.indexOf(e[0])] : `${e.length} days`}; your heating times are unchanged`
      );
    }, this.applyPoint = () => {
      const t = this.editing;
      if (!t) return;
      const e = p[t.day];
      if (S(this.shownWeek[e] ?? []).findIndex((o, r) => o.time === t.time && r !== t.index) >= 0) {
        this.showToast(`There's already a change at ${N(t.time)}. Pick another time.`, !0);
        return;
      }
      const n = { time: t.time, setpoint: t.off ? Vt : t.setpoint };
      this.editDraft((o) => {
        const r = [...o[e] ?? []];
        t.index === null ? r.push(n) : r[t.index] = n, o[e] = r.sort((l, d) => l.time - d.time);
      }), this.editing = null;
    }, this.removePoint = () => {
      const t = this.editing;
      if (!t || t.index === null) return;
      const e = p[t.day];
      this.editDraft((s) => {
        s[e] = (s[e] ?? []).filter((i, n) => n !== t.index);
      }), this.editing = null;
    }, this.applyCopy = () => {
      const t = this.copyDays;
      if (!t?.length) return;
      const e = p[this.scheduleDay];
      this.editDraft((s) => {
        for (const i of t) s[p[i]] = [...s[e] ?? []];
      }), this.showToast(`Copied to ${t.length === 1 ? A[t[0]] : `${t.length} days`}. Save to send it.`), this.copyDays = null;
    }, this.saveSchedule = () => {
      const t = this.link, e = this.draft;
      if (!t || !e) return;
      const s = this.dirtyDays;
      try {
        localStorage.getItem(wt) || localStorage.setItem(wt, JSON.stringify({ saved: (/* @__PURE__ */ new Date()).toISOString(), week: t.week }));
      } catch {
      }
      this.command(async () => {
        await t.saveSchedule(e, s), this.draft = null;
      }, `Saved to the receiver (${s.length === 1 ? A[p.indexOf(s[0])] : `${s.length} days`})`);
    }, this.restoreBackup = () => {
      const t = this.backup;
      t && (this.editDraft((e) => {
        for (const s of p) t.week[s] && (e[s] = S(t.week[s]));
      }), this.showToast(this.draft ? "Previous schedule loaded. Save to send it." : "That's already the receiver's schedule."));
    };
  }
  connectedCallback() {
    super.connectedCallback(), window.addEventListener("location-changed", this.onLocationChanged), window.addEventListener("popstate", this.onLocationChanged), document.addEventListener("visibilitychange", this.onVisibility), window.addEventListener("keydown", this.onKeyDown), this.tickTimer = window.setInterval(() => this.tick++, 3e4);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("location-changed", this.onLocationChanged), window.removeEventListener("popstate", this.onLocationChanged), document.removeEventListener("visibilitychange", this.onVisibility), window.removeEventListener("keydown", this.onKeyDown), window.clearInterval(this.tickTimer), window.clearTimeout(this.toastTimer), this.link?.stop(), this.link = void 0, this.started = !1;
  }
  willUpdate(t) {
    t.has("panel") && this.setAttribute("theme", this.panel?.config?.theme === "ha" ? "ha" : "porch");
  }
  updated() {
    if (this.started || !this.hass || !this.panel) return;
    this.started = !0, this.applyUrl();
    const t = this.rc?.topic;
    t && (this.link = new Ye(() => this.hass, t, () => this.requestUpdate(), this.rc?.state_entity), this.link.start());
  }
  showToast(t, e = !1) {
    this.toast = t, this.toastError = e, window.clearTimeout(this.toastTimer), this.toastTimer = window.setTimeout(() => this.toast = "", e ? 8e3 : 2500);
  }
  async command(t, e, s, i) {
    if (s) {
      const d = this.liveReceiver;
      this.frozen = { view: i === void 0 ? d : { ...d, target: i, off: !1 }, mode: s };
    }
    let n = !1;
    try {
      await t(), n = !0, this.queuedTemp === null && this.showToast(e);
    } catch (d) {
      this.showToast(Qt(d), !0);
    } finally {
      this.frozen = null;
    }
    const o = this.queuedTemp;
    this.queuedTemp = null;
    const r = this.link, l = s ?? this.receiver.mode;
    n && o !== null && r && this.command(
      () => r.setTarget(o),
      `${l === "manual" ? "Manual at" : "Set to"} ${w(o)}`,
      l,
      o
    );
  }
  /** The dial can be used now, including while a change is still being sent (the turn is then queued). */
  dialUsable(t) {
    const e = this.link;
    if (!e || e.status !== "live") return !1;
    const s = this.frozen?.mode ?? t;
    return !Yt.includes(s) || (s === "schedule" || s === "override") && this.rc?.controls?.override === !1 ? !1 : !e.busy || !!this.frozen;
  }
  /**
   * The dial was turned. While a change is still being sent (e.g. Manual being set up, which resets the
   * temperature when the hold starts), show the choice straight away and send it once the receiver is ready.
   */
  onDial(t, e) {
    const s = this.link;
    if (!s) return;
    if (s.busy) {
      this.frozen && Yt.includes(this.frozen.mode) && (this.queuedTemp = t, this.frozen = { ...this.frozen, view: { ...this.frozen.view, target: t, off: !1 } });
      return;
    }
    const i = e === "schedule" || e === "override" ? It(s.week, /* @__PURE__ */ new Date()) : null, n = i ? ` until ${this.whenText({ ...i, setpoint: t }).replace(/^at /, "")}` : "";
    this.command(() => s.setTarget(t), `${w(t)}${n}`, e, t);
  }
  onMode(t) {
    const e = this.link;
    if (e) {
      if (t === "boost") return this.openBoost();
      if (t !== e.mode)
        if (t === "schedule") this.command(() => e.toSchedule(), "Back on the schedule", "schedule");
        else if (t === "manual") {
          const s = this.manualTemp;
          this.command(() => e.manual(s), `Manual at ${w(s)}`, "manual", s);
        } else t === "off" && this.command(() => e.off(), "Heating off", "off");
    }
  }
  /** Manual starts from the temperature showing, or 20° if the heating is off. */
  get manualTemp() {
    const t = this.receiver;
    return t.target !== null && !t.off ? t.target : 20;
  }
  get isAdmin() {
    return this.hass?.user?.is_admin === !0;
  }
  /** A shared setting: the helper if it exists, else the panel config, else the built-in default. */
  setting(t) {
    const e = this.chosen[t];
    if (e !== void 0) return e;
    const s = Number(this.hass?.states[bt[t].id]?.state);
    if (Number.isFinite(s)) return s;
    const i = this.rc?.controls, n = typeof i?.boost == "object" ? i.boost : {};
    return (t === "away_temperature" ? i?.away_temperature : n[t]) ?? { minutes: 15, temperature: 22, away_temperature: 14 }[t];
  }
  get boostConfig() {
    const t = this.rc?.controls?.boost, e = (typeof t == "object" ? t.max_minutes : void 0) ?? 120;
    return { minutes: Math.min(this.setting("minutes"), e), temperature: this.setting("temperature"), max_minutes: e };
  }
  async saveSetting(t, e) {
    const s = bt[t];
    this.chosen = { ...this.chosen, [t]: e };
    try {
      if (!this.hass.states[s.id]) {
        await this.hass.callWS({
          type: "input_number/create",
          name: s.name,
          min: s.min,
          max: s.max,
          step: s.step,
          initial: e,
          mode: "box",
          unit_of_measurement: s.unit,
          icon: s.icon
        });
        for (let i = 0; i < 20 && !this.hass.states[s.id]; i++) await Qe(250);
        if (!this.hass.states[s.id])
          throw new Error(`the helper was created but ${s.id} didn't appear. Check Settings → Devices & services → Helpers.`);
      }
      await this.hass.callService("input_number", "set_value", { value: e }, { entity_id: s.id }), this.showToast("Saved for everyone");
    } catch (i) {
      const { [t]: n, ...o } = this.chosen;
      this.chosen = o, this.showToast(`Couldn't save: ${Qt(i)}`, !0);
    }
  }
  openBoost() {
    const t = this.boostConfig;
    this.boostMinutes = t.minutes, this.boostTemp = t.temperature, this.boostOpen = !0;
  }
  /** A date `days` from today at local midnight, as a timestamp. */
  dayFromToday(t) {
    const e = /* @__PURE__ */ new Date();
    return e.setHours(0, 0, 0, 0), e.setDate(e.getDate() + t), e.getTime();
  }
  get awayUntil() {
    const t = new Date(this.awayDay);
    return t.setHours(Math.floor(this.awayTime / 60), this.awayTime % 60, 0, 0), t;
  }
  /** "Sun at 18:00", "tomorrow at 18:00", "12 Oct at 18:00". */
  dateText(t) {
    const e = Math.round((new Date(t).setHours(0, 0, 0, 0) - this.dayFromToday(0)) / 864e5);
    return `${e === 0 ? "today" : e === 1 ? "tomorrow" : e < 7 ? J[C(t)] : t.toLocaleDateString(void 0, { day: "numeric", month: "short" })} at ${N(t.getHours() * 60 + t.getMinutes())}`;
  }
  /** When an Away running now ends, from the receiver's countdown. */
  get awayEnds() {
    const t = this.link?.holdEnds;
    return t == null ? null : new Date(Math.round(t / 6e4) * 6e4);
  }
  openAway() {
    this.awayDay = this.dayFromToday(1), this.awayTime = 18 * 60, this.awayTemp = this.setting("away_temperature"), this.awayOpen = !0;
  }
  /**
   * Reads options from the address, so dashboard buttons can open e.g. /heating?view=schedule
   * or /heating?radiator=bedroom. `radiator` matches a radiator's name or entity.
   */
  applyUrl() {
    const t = `/${this.panel?.url_path ?? "heating"}`;
    if (!location.pathname.startsWith(t)) return;
    const e = new URLSearchParams(location.search), s = e.get("kiosk");
    this.kiosk = s !== null && s !== "0" && s !== "false";
    const i = e.get("radiator")?.toLowerCase();
    if (i) {
      const o = this.radiators.findIndex(
        (r) => [r.name, r.entity, r.entity.split(".")[1]].some((l) => l?.toLowerCase() === i)
      );
      if (o >= 0) {
        this.view = { kind: "radiator", index: o };
        return;
      }
    }
    const n = e.get("view");
    this.view = n === "schedule" ? { kind: "schedule" } : n === "settings" ? { kind: "settings" } : { kind: "main" }, this.view.kind === "settings" && (this.chosen = {});
  }
  /** Moves between views through the address bar, so the phone's back button works. */
  go(t, e = !1) {
    const s = new URLSearchParams(t);
    this.kiosk && s.set("kiosk", "1");
    const i = s.toString(), n = `/${this.panel.url_path}${i ? `?${i}` : ""}`;
    e ? history.replaceState(null, "", n) : history.pushState({ heatingPanel: !0 }, "", n), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: e } }));
  }
  get rc() {
    return this.panel?.config?.receiver;
  }
  get radiators() {
    return this.panel?.config?.radiators ?? [];
  }
  get controls() {
    const t = this.rc?.controls ?? {};
    return { modes: t.modes !== !1, boost: t.boost !== !1, away: t.away !== !1 };
  }
  /** What to show for the receiver; frozen on the requested mode while a command runs. */
  get receiver() {
    const t = this.frozen;
    return t ? { ...t.view, mode: t.mode, off: t.mode === "off" || t.view.off } : this.liveReceiver;
  }
  /** Live from MQTT, or basic details from its climate entity. */
  get liveReceiver() {
    const t = this.link;
    if (t?.status === "live") {
      const s = t.report, i = t.mode, n = k(t.target);
      return {
        mode: i,
        target: n,
        off: i === "off" || n !== null && E(n),
        current: k(s.local_temperature),
        heating: s.running_state === "heat"
      };
    }
    const e = this.rc?.entity ? this.hass?.states[this.rc.entity] : void 0;
    return {
      mode: "unknown",
      target: k(e?.attributes.temperature),
      off: e?.state === "off",
      current: k(e?.attributes.current_temperature),
      heating: e?.attributes.hvac_action === "heating"
    };
  }
  whenText(t) {
    return `${t.dayOffset === 0 ? "" : t.dayOffset === 1 ? "tomorrow " : `${J[(C(/* @__PURE__ */ new Date()) + t.dayOffset) % 7]} `}at ${N(t.time)}`;
  }
  /** The line under the room temperature: what happens next. */
  noteFor(t) {
    const e = this.link;
    if (!e || e.status !== "live") return { text: "", attention: !1 };
    if (t === "boost") {
      const s = e.minutesLeft;
      return s === null ? { text: "Boost has no end time", attention: !0 } : { text: s === 0 ? "Less than a minute left" : `${s} min left`, attention: !1 };
    }
    if (t === "away") {
      const s = this.awayEnds;
      return { text: s ? `Until ${this.dateText(s)}` : "", attention: !1 };
    }
    if (t === "manual") return { text: "Until you change it", attention: !1 };
    if (t === "schedule" || t === "override") {
      const s = Be(e.week, /* @__PURE__ */ new Date());
      if (!s) return { text: "", attention: !1 };
      if (t === "override") {
        const n = It(e.week, /* @__PURE__ */ new Date());
        return { text: n ? `Back to schedule ${this.whenText({ ...n, setpoint: 0 })}` : "", attention: !1 };
      }
      return { text: `${E(s.setpoint) ? "Off" : w(s.setpoint)} ${this.whenText(s)}`, attention: !1 };
    }
    return { text: "", attention: !1 };
  }
  render() {
    if (!this.rc?.topic)
      return h`<div class="app"><p class="notice setup">
        Add a <code>receiver:</code> with its zigbee2mqtt <code>topic:</code> to this panel's
        <code>config:</code> in configuration.yaml, then restart Home Assistant.
      </p></div>`;
    const t = this.view, e = t.kind === "radiator" ? this.radiators[t.index] : void 0, s = t.kind === "schedule" ? "Schedule" : t.kind === "settings" ? "Settings" : e ? this.radiatorName(e) : this.rc.name ?? "Heating";
    return h`
      <div class="app">
        ${this.renderHeader(s)} ${this.renderNotices()}
        ${t.kind === "schedule" ? this.renderSchedule() : t.kind === "settings" ? this.renderSettings() : e ? this.renderRadiator(e) : this.renderMain()}
        ${this.renderBoostSheet()} ${this.renderAwaySheet()}
        ${this.toast ? h`<div class="toast ${this.toastError ? "error" : ""}" role="status">${this.toast}</div>` : c}
      </div>
    `;
  }
  renderHeader(t) {
    const e = this.view.kind !== "main";
    return this.kiosk && !e ? h`<div class="kiosk-gap"></div>` : h`<header>
      ${e ? h`<button class="round back" title="Back" aria-label="Back" @click=${this.back}>${ts}</button>` : this.narrow ? h`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : c}
      <h1>${t}</h1>
      ${!e && this.isAdmin ? h`<button class="round" title="Settings" aria-label="Settings" @click=${() => this.go({ view: "settings" })}>
            ${ss}
          </button>` : c}
    </header>`;
  }
  renderNotices() {
    const t = this.link, e = [];
    switch (t?.status) {
      case "no-access":
        e.push(h`<p class="notice">
          The heating controls need the receiver sensor set up in Home Assistant (ask whoever looks after it), or an
          administrator login. ${this.rc?.entity ? `Showing basic details from ${this.rc.entity} for now.` : ""}
        </p>`);
        break;
      case "no-entity":
        e.push(h`<div class="notice">
          <p>
            The receiver sensor <code>${this.rc?.state_entity}</code> doesn't exist yet. Add this to configuration.yaml
            and restart Home Assistant:
          </p>
          <pre>${this.sensorYaml()}</pre>
        </div>`);
        break;
      case "no-integration":
        e.push(h`<p class="notice">
          Changing the heating needs the Heating panel integration installed in Home Assistant (ask whoever looks
          after it), or an administrator login.
        </p>`);
        break;
      case "no-mqtt":
        e.push(h`<p class="notice">
          Home Assistant's MQTT integration isn't set up, so the panel can't reach the receiver. Add it under
          Settings → Devices &amp; services.
        </p>`);
        break;
      case "silent":
        e.push(h`<p class="notice">
          No reply from the receiver on “${t.topic}”. Check this matches the receiver's name in zigbee2mqtt,
          and that zigbee2mqtt is running.
        </p>`);
        break;
      case "error":
        e.push(h`<p class="notice">
          Couldn't reach the receiver (${t.errorText}). Check zigbee2mqtt and Home Assistant's MQTT integration
          are running.
        </p>`);
        break;
    }
    return t?.unexpected && e.push(h`<div class="notice attention with-action">
        <span>${t.unexpected}</span>
        <button class="close" @click=${() => {
      t.unexpected = "", this.requestUpdate();
    }}>OK</button>
      </div>`), t?.retainedCommand && e.push(h`<p class="notice attention">
        Your MQTT broker has a saved command for the receiver (a retained message on “${t.topic}/set”).
        zigbee2mqtt sends it again every time it restarts, which can turn on a boost by itself. Delete it with an
        MQTT tool such as MQTT Explorer.
      </p>`), e.length ? h`<div class="notices">${e}</div>` : c;
  }
  /** The configuration.yaml snippet for the receiver sensor, filled in for this receiver. */
  sensorYaml() {
    const t = this.rc?.state_entity ?? "sensor.heating_panel_receiver", e = t.split(".")[1], s = this.rc?.topic ?? "zigbee2mqtt/Hive receiver";
    return `mqtt:
  sensor:
    - name: ${e.replace(/_/g, " ")}
      unique_id: ${e}
      state_topic: "${s}"
      value_template: "{{ value_json.system_mode }}"
      json_attributes_topic: "${s}"
      force_update: true

recorder:
  exclude:
    entities:
      - ${t}`;
  }
  renderMain() {
    const t = this.rc, e = this.receiver, s = this.frozen ? { text: "", attention: !1 } : this.noteFor(e.mode), i = this.controls, n = [
      ...i.modes ? [
        { mode: "schedule", label: "Schedule" },
        { mode: "manual", label: "Manual" },
        { mode: "off", label: "Off" }
      ] : [],
      ...i.boost ? [{ mode: "boost", label: "Boost" }] : []
    ], o = e.mode === "override" ? "schedule" : e.mode, r = this.link, l = r?.status === "live" && !r.busy, d = this.dialUsable(e.mode), m = e.mode === "away" && !this.frozen ? this.awayEnds : null, u = r?.status === "live" ? r.tpi : null;
    return h`
      <section class="hero">
        <heating-dial
          .min=${t.min_temp ?? 5}
          .max=${t.max_temp ?? 32}
          .target=${e.target}
          .current=${e.current}
          .off=${e.off}
          .active=${e.heating || e.mode === "boost"}
          .label=${u && vt[e.mode] ? `${vt[e.mode]} · TPI` : vt[e.mode]}
          .note=${s.text}
          .attention=${s.attention}
          .readonly=${!d}
          @dial-change=${(f) => this.onDial(f.detail.value, e.mode)}
        ></heating-dial>
        <p class="running ${e.heating && !r?.busy ? "on" : ""}">
          ${r?.busy ? "Sending to the receiver…" : e.heating ? h`${es} Heating now` : "Not heating"}
        </p>
        ${u && !r?.busy ? this.renderTpi(u) : c}
      </section>

      ${n.length ? h`<div class="modes" style=${`--n: ${n.length}`}>
            ${n.map(
      (f) => h`<button
                class="mode"
                aria-pressed=${String(o === f.mode)}
                title=${f.label}
                ?disabled=${!l}
                @click=${() => this.onMode(f.mode)}
              >
                ${f.label}
              </button>`
    )}
          </div>` : c}

      ${i.away ? h`<button
            class="away-button"
            aria-pressed=${String(e.mode === "away")}
            ?disabled=${!l || e.mode === "boost"}
            @click=${() => this.openAway()}
          >
            ${Gt}
            ${e.mode === "away" ? m ? `Away until ${this.dateText(m)}` : "Away" : "Going away?"}
          </button>` : c}

      <button class="card" @click=${() => this.go({ view: "schedule" })}>
        <span class="card-head">
          <span>Schedule</span>
          ${Xt}
        </span>
        ${this.renderBar(C(/* @__PURE__ */ new Date()))} ${this.renderTicks()}
        ${this.renderScheduleStatus()}
      </button>

      ${this.renderRadiators(e.heating)}
    `;
  }
  renderSettings() {
    if (!this.isAdmin) return h`<p class="notice">Only an administrator can change these settings.</p>`;
    const t = this.setting("minutes"), e = this.boostConfig.max_minutes, s = (i, n, o, r) => {
      const l = this.setting(i);
      return h`<div class="stepper">
        <button class="round" title="Lower" aria-label=${`Lower the ${n}`} ?disabled=${l <= o}
          @click=${() => this.saveSetting(i, Math.max(o, l - 0.5))}>${L}</button>
        <span class="stepper-value">${w(l)}</span>
        <button class="round" title="Raise" aria-label=${`Raise the ${n}`} ?disabled=${l >= r}
          @click=${() => this.saveSetting(i, Math.min(r, l + 0.5))}>${I}</button>
      </div>`;
    };
    return h`
      <p class="empty">These apply to everyone using the panel, on every phone.</p>
      <h2>Boost</h2>
      <p class="sheet-label">Usual length</p>
      <div class="chips">
        ${Wt.filter((i) => i <= e).map(
      (i) => h`<button class="chip" aria-pressed=${String(i === t)} @click=${() => this.saveSetting("minutes", i)}>
            ${X(i)}
          </button>`
    )}
      </div>
      <p class="sheet-label">Usual temperature</p>
      ${s("temperature", "usual boost temperature", 12, this.rc?.max_temp ?? 32)}
      ${this.controls.away ? h`<h2>Away</h2>
            <p class="sheet-label">Temperature while away</p>
            ${s("away_temperature", "away temperature", bt.away_temperature.min, ct)}` : c}
    `;
  }
  renderAwaySheet() {
    if (!this.awayOpen) return c;
    const t = this.link, e = !!t?.busy, s = t?.mode === "away", i = this.awayEnds, n = this.awayUntil, o = (n.getTime() - Date.now()) / 6e4, r = o >= 1 && o <= he, l = (u) => {
      const f = new Date(u);
      return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
    }, d = [1, 2, 3, 4, 5, 6, 7].map((u) => this.dayFromToday(u)), m = (u) => this.awayTime = (this.awayTime + u + 24 * 60) % (24 * 60);
    return h`<div class="sheet-backdrop" @click=${(u) => u.target === u.currentTarget && (this.awayOpen = !1)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Away">
        <div class="sheet-head">
          <span>${Gt} Away</span>
          <button class="close" @click=${() => this.awayOpen = !1}>Close</button>
        </div>
        ${s ? h`<p class="sheet-text">
                Away at ${w(t?.report.occupied_heating_setpoint ?? 0)}${i ? ` until ${this.dateText(i)}` : ""}. The
                heating goes back to its schedule then by itself.
              </p>
              <button class="primary" ?disabled=${e} @click=${this.endAway}>We're back: end Away now</button>` : h`<p class="sheet-text">
                Keeps the house at a low temperature while you're away, then goes back to the schedule by itself. Set
                the return a little early to come home to a warm house.
              </p>
              <p class="sheet-label">Back on</p>
              <div class="chips">
                ${d.slice(0, 6).map(
      (u, f) => h`<button class="chip" aria-pressed=${String(u === this.awayDay)} @click=${() => this.awayDay = u}>
                    ${f === 0 ? "Tomorrow" : J[C(new Date(u))]}
                  </button>`
    )}
              </div>
              <label class="date-pick">
                <span>Or a date</span>
                <input
                  type="date"
                  .value=${l(this.awayDay)}
                  min=${l(this.dayFromToday(0))}
                  max=${l(this.dayFromToday(44))}
                  @change=${(u) => {
      const [f, T, B] = u.target.value.split("-").map(Number);
      f && (this.awayDay = new Date(f, T - 1, B).getTime());
    }}
                />
              </label>
              <p class="sheet-label">at</p>
              <div class="stepper time-stepper">
                <button class="round small" title="An hour earlier" aria-label="An hour earlier" @click=${() => m(-60)}>−1h</button>
                <button class="round" title="15 minutes earlier" aria-label="15 minutes earlier" @click=${() => m(-15)}>${L}</button>
                <span class="stepper-value">${N(this.awayTime)}</span>
                <button class="round" title="15 minutes later" aria-label="15 minutes later" @click=${() => m(15)}>${I}</button>
                <button class="round small" title="An hour later" aria-label="An hour later" @click=${() => m(60)}>+1h</button>
              </div>
              <p class="sheet-label">Temperature while away</p>
              <div class="stepper">
                <button class="round" title="Lower" aria-label="Lower the away temperature" ?disabled=${this.awayTemp <= 5}
                  @click=${() => this.awayTemp = Math.max(5, this.awayTemp - 0.5)}>${L}</button>
                <span class="stepper-value">${w(this.awayTemp)}</span>
                <button class="round" title="Raise" aria-label="Raise the away temperature" ?disabled=${this.awayTemp >= ct}
                  @click=${() => this.awayTemp = Math.min(ct, this.awayTemp + 0.5)}>${I}</button>
              </div>
              <button class="primary" ?disabled=${e || !r || t?.status !== "live"} @click=${this.startAway}>
                ${r ? `Away until ${this.dateText(n)}` : o < 1 ? "Pick a time in the future" : "That's too far ahead (45 days at most)"}
              </button>`}
      </div>
    </div>`;
  }
  renderBoostSheet() {
    if (!this.boostOpen) return c;
    const t = this.link, e = !!t?.busy, s = this.boostConfig, i = t?.mode === "boost", n = this.rc?.max_temp ?? 32, o = [.../* @__PURE__ */ new Set([...Wt, s.minutes])].filter((l) => l <= s.max_minutes).sort((l, d) => l - d), r = t?.minutesLeft;
    return h`<div
      class="sheet-backdrop"
      @click=${(l) => {
      l.target === l.currentTarget && (this.boostOpen = !1);
    }}
    >
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Boost">
        <div class="sheet-head">
          <span>Boost</span>
          <button class="close" @click=${() => this.boostOpen = !1}>Close</button>
        </div>
        ${i ? h`<p class="sheet-text">
                Boosting at ${w(t?.report.occupied_heating_setpoint ?? 0)}${r == null ? "" : r === 0 ? ", less than a minute left" : `, ${X(r)} left`}.
              </p>
              <button class="primary" ?disabled=${e} @click=${this.stopBoost}>Stop boost</button>` : h`<p class="sheet-label">How long</p>
              <div class="chips">
                ${o.map(
      (l) => h`<button
                    class="chip"
                    aria-pressed=${String(l === this.boostMinutes)}
                    @click=${() => this.boostMinutes = l}
                  >
                    ${X(l)}
                  </button>`
    )}
              </div>
              <p class="sheet-label">Temperature</p>
              <div class="stepper">
                <button
                  class="round"
                  title="Lower"
                  aria-label="Lower the boost temperature"
                  ?disabled=${this.boostTemp <= 12}
                  @click=${() => this.boostTemp = Math.max(12, this.boostTemp - 0.5)}
                >
                  ${L}
                </button>
                <span class="stepper-value">${w(this.boostTemp)}</span>
                <button
                  class="round"
                  title="Raise"
                  aria-label="Raise the boost temperature"
                  ?disabled=${this.boostTemp >= n}
                  @click=${() => this.boostTemp = Math.min(n, this.boostTemp + 0.5)}
                >
                  ${I}
                </button>
              </div>
              <button class="primary" ?disabled=${e || t?.status !== "live"} @click=${this.startBoost}>
                Boost for ${X(this.boostMinutes)}
              </button>`}
      </div>
    </div>`;
  }
  renderScheduleStatus() {
    const t = this.link?.scheduleState;
    return t === "loading" && !this.link?.scheduleDays ? h`<p class="empty">Reading the schedule from the receiver…</p>` : t === "partial" ? h`<p class="empty">Only ${this.link?.scheduleDays} of 7 days came back from the receiver.</p>` : c;
  }
  renderBar(t, e = this.link?.week ?? {}) {
    const s = Re(e, t), i = /* @__PURE__ */ new Date(), n = i.getHours() * 60 + i.getMinutes(), o = t === C(i);
    return h`<span class="bar ${s.length ? "" : "unknown"}">
      ${s.map((r) => {
      const l = r.setpoint === null ? "unknown" : E(r.setpoint) ? "off" : "on", d = l === "on" ? `background: ${$t(r.setpoint)};` : "";
      return h`<span
          class="seg ${l}"
          style=${`left: ${r.start / 14.4}%; width: ${(r.end - r.start) / 14.4}%; ${d}`}
        ></span>`;
    })}
      ${o && s.length ? h`<span class="now" style=${`left: ${n / 14.4}%`}></span>` : c}
    </span>`;
  }
  renderTicks() {
    return h`<span class="ticks" aria-hidden="true">
      ${[0, 6, 12, 18, 24].map((t) => h`<span style=${`left: ${t / 24 * 100}%`}>${String(t).padStart(2, "0")}</span>`)}
    </span>`;
  }
  // ---- Schedule editing ----
  /** What the schedule screen shows: the draft if there is one, else what the receiver has. */
  get shownWeek() {
    return this.draft ?? this.link?.week ?? {};
  }
  get canEditSchedule() {
    const t = this.link;
    return !!t && t.status === "live" && !t.busy && t.scheduleDays === p.length;
  }
  /** Days whose draft differs from the receiver's schedule. */
  get dirtyDays() {
    const t = this.draft, e = this.link?.week ?? {};
    return t ? p.filter((s) => !xt(t[s], e[s])) : [];
  }
  editDraft(t) {
    const e = Ge(this.draft ?? this.link?.week ?? {});
    for (const s of p) e[s] && (e[s] = S(e[s]));
    t(e), this.draft = this.dirtyDaysOf(e).length ? e : null;
  }
  /**
   * Days whose filler slots aren't the panel's (the receiver's own, at e.g. 12:00 and 14:00). A temporary
   * change ends at the next slot of any kind, so on these days it can end early.
   */
  get untidyDays() {
    const t = this.link?.week ?? {}, e = (s) => JSON.stringify([...s].sort((i, n) => i.time - n.time));
    return p.filter((s) => t[s] && e(t[s]) !== e(le(t[s])));
  }
  dirtyDaysOf(t) {
    const e = this.link?.week ?? {};
    return p.filter((s) => !xt(t[s], e[s]));
  }
  openPoint(t, e) {
    if (!this.canEditSchedule) return;
    const s = S(this.shownWeek[p[t]] ?? []), i = e === null ? void 0 : s[e], n = s[s.length - 1], o = i?.time ?? Math.min(23 * 60 + 45, (n?.time ?? 6 * 60) + 60), r = i?.setpoint ?? (n && !E(n.setpoint) ? Vt : 20);
    this.editing = {
      day: t,
      index: e,
      time: o,
      setpoint: E(r) ? 20 : r,
      off: E(r)
    };
  }
  get backup() {
    try {
      const t = localStorage.getItem(wt);
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  renderSchedule() {
    const t = this.shownWeek, e = this.scheduleDay, s = S(t[p[e]] ?? []), i = this.link?.scheduleState, n = this.canEditSchedule, o = this.dirtyDays, r = this.backup;
    return h`
      <section class="schedule ${o.length ? "has-save-bar" : ""}">
        <div class="week">
          ${p.map(
      (l, d) => h`<button
              class="day-row"
              aria-pressed=${String(d === e)}
              aria-label=${`${A[d]}${o.includes(l) ? ", not saved" : ""}`}
              @click=${() => this.scheduleDay = d}
            >
              <span class="day-name">${J[d]}${o.includes(l) ? h`<span class="dot" title="Not saved"></span>` : c}</span>
              ${this.renderBar(d, t)}
            </button>`
    )}
          <div class="day-row ticks-row"><span></span>${this.renderTicks()}</div>
        </div>

        <h2>${A[e]}</h2>
        ${s.length ? h`<ol class="points">
              ${s.map(
      (l, d) => h`<li>
                  <button class="point" ?disabled=${!n} @click=${() => this.openPoint(e, d)}>
                    <span class="time">${N(l.time)}</span>
                    <span
                      class="swatch ${E(l.setpoint) ? "off" : "on"}"
                      style=${E(l.setpoint) ? "" : `background: ${$t(l.setpoint)}`}
                    ></span>
                    <span>${E(l.setpoint) ? "Off" : w(l.setpoint)}</span>
                    ${n ? Xt : c}
                  </button>
                </li>`
    )}
            </ol>` : h`<p class="empty">
              ${i === "loading" ? "Reading the schedule from the receiver…" : "No schedule for this day has come back yet."}
            </p>`}
        ${s.length ? h`<div class="point-actions">
              <button class="secondary" ?disabled=${!n || s.length >= tt} @click=${() => this.openPoint(e, null)}>
                Add a change
              </button>
              <button class="secondary" ?disabled=${!n} @click=${() => this.copyDays = []}>Copy to other days</button>
            </div>
            ${s.length >= tt ? h`<p class="empty">The receiver allows ${tt} changes a day.</p>` : c}` : c}
        ${i === "partial" || i !== "loading" && this.link && this.link.scheduleDays < 7 ? h`<button class="retry" @click=${() => this.link?.requestSchedule()}>Read again</button>` : c}
        ${n && !o.length && this.untidyDays.length ? h`<div class="card tidy">
              <p>
                ${this.untidyDays.length === 7 ? "Every day" : `${this.untidyDays.length} days`} still
                ${this.untidyDays.length === 1 || this.untidyDays.length === 7 ? "has" : "have"} the receiver's own filler times, so a temporary change
                can end early (for example at 12:00). Tidying them keeps your heating times exactly the same.
              </p>
              <button class="secondary" @click=${this.tidySchedule}>Tidy the schedule</button>
            </div>` : c}
        ${r && n ? h`<button class="link" @click=${this.restoreBackup}>
              Put back the schedule from before the first change (${new Date(r.saved).toLocaleDateString()})
            </button>` : c}
      </section>

      ${o.length ? h`<div class="save-bar">
            <button class="secondary" ?disabled=${this.link?.busy} @click=${() => this.draft = null}>Discard</button>
            <button class="primary" ?disabled=${!this.link || this.link.busy || this.link.status !== "live"} @click=${this.saveSchedule}>
              ${this.link?.busy ? "Saving…" : `Save ${o.length === 1 ? A[p.indexOf(o[0])] : `${o.length} days`}`}
            </button>
          </div>` : c}
      ${this.renderPointSheet()} ${this.renderCopySheet()}
    `;
  }
  renderPointSheet() {
    const t = this.editing;
    if (!t) return c;
    const e = (n) => this.editing = { ...t, ...n }, s = (n) => e({ time: Math.min(23 * 60 + 45, Math.max(0, t.time + n)) }), i = S(this.shownWeek[p[t.day]] ?? []);
    return h`<div class="sheet-backdrop" @click=${(n) => n.target === n.currentTarget && (this.editing = null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Change">
        <div class="sheet-head">
          <span>${t.index === null ? `New change on ${A[t.day]}` : `${A[t.day]}, ${N(i[t.index]?.time ?? t.time)}`}</span>
          <button class="close" @click=${() => this.editing = null}>Close</button>
        </div>
        <p class="sheet-label">Starts at</p>
        <div class="stepper time-stepper">
          <button class="round small" title="An hour earlier" aria-label="An hour earlier" @click=${() => s(-60)}>−1h</button>
          <button class="round" title="15 minutes earlier" aria-label="15 minutes earlier" @click=${() => s(-15)}>${L}</button>
          <span class="stepper-value">${N(t.time)}</span>
          <button class="round" title="15 minutes later" aria-label="15 minutes later" @click=${() => s(15)}>${I}</button>
          <button class="round small" title="An hour later" aria-label="An hour later" @click=${() => s(60)}>+1h</button>
        </div>
        <p class="sheet-label">Heating</p>
        <div class="chips two">
          <button class="chip" aria-pressed=${String(!t.off)} @click=${() => e({ off: !1 })}>On</button>
          <button class="chip" aria-pressed=${String(t.off)} @click=${() => e({ off: !0 })}>Off</button>
        </div>
        <div class="stepper ${t.off ? "dimmed" : ""}">
          <button
            class="round"
            title="Lower"
            aria-label="Lower the temperature"
            ?disabled=${t.off || t.setpoint <= Jt}
            @click=${() => e({ setpoint: Math.max(Jt, t.setpoint - 0.5) })}
          >
            ${L}
          </button>
          <span class="stepper-value">${t.off ? "Off" : w(t.setpoint)}</span>
          <button
            class="round"
            title="Raise"
            aria-label="Raise the temperature"
            ?disabled=${t.off || t.setpoint >= Kt}
            @click=${() => e({ setpoint: Math.min(Kt, t.setpoint + 0.5) })}
          >
            ${I}
          </button>
        </div>
        <button class="primary" @click=${this.applyPoint}>Done</button>
        ${t.index !== null ? h`<button class="link danger" ?disabled=${i.length <= 1} @click=${this.removePoint}>
              ${i.length <= 1 ? "A day needs at least one change" : "Remove this change"}
            </button>` : c}
      </div>
    </div>`;
  }
  renderCopySheet() {
    const t = this.copyDays;
    if (!t) return c;
    const e = this.scheduleDay, s = (n) => this.copyDays = t.includes(n) ? t.filter((o) => o !== n) : [...t, n], i = p.map((n, o) => o).filter((n) => n !== e);
    return h`<div class="sheet-backdrop" @click=${(n) => n.target === n.currentTarget && (this.copyDays = null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Copy to other days">
        <div class="sheet-head">
          <span>Copy ${A[e]} to…</span>
          <button class="close" @click=${() => this.copyDays = null}>Close</button>
        </div>
        <div class="chips">
          ${i.map(
      (n) => h`<button class="chip" aria-pressed=${String(t.includes(n))} @click=${() => s(n)}>
              ${J[n]}
            </button>`
    )}
          <button
            class="chip"
            @click=${() => this.copyDays = e < 5 ? i.filter((n) => n < 5) : i.filter((n) => n >= 5)}
          >
            ${e < 5 ? "Weekdays" : "Weekend"}
          </button>
          <button class="chip" @click=${() => this.copyDays = i}>All</button>
        </div>
        <button class="primary" ?disabled=${!t.length} @click=${this.applyCopy}>
          ${t.length ? `Copy to ${t.length === 1 ? A[t[0]] : `${t.length} days`}` : "Pick the days"}
        </button>
      </div>
    </div>`;
  }
  radiatorName(t) {
    const e = this.hass?.states[t.entity];
    return t.name ?? e?.attributes.friendly_name ?? t.entity;
  }
  sensorNumber(t) {
    if (!t) return null;
    const e = Number(this.hass?.states[t]?.state);
    return Number.isFinite(e) ? e : null;
  }
  valve(t, e) {
    return Je({
      sensor: this.sensorNumber(t.position),
      hasSensor: !!t.position,
      boilerHeating: this.receiver.heating,
      state: e.state,
      action: typeof e.attributes.hvac_action == "string" ? e.attributes.hvac_action : void 0,
      current: k(e.attributes.current_temperature),
      target: k(e.attributes.temperature)
    });
  }
  renderRadiators(t) {
    const e = this.radiators;
    if (!e.length) return c;
    const s = this.panel.config.radiators_when === "always" || t;
    return h`<section class="radiators">
      <h2>Radiators</h2>
      ${s ? h`<div class="rows">${e.map((i) => this.renderRadiatorRow(i))}</div>` : h`<p class="empty">Radiators appear when the heating is on.</p>`}
    </section>`;
  }
  renderRadiatorRow(t) {
    const e = this.hass.states[t.entity], s = this.radiatorName(t);
    if (!e)
      return h`<div class="row missing">
        <span class="row-name">${s}</span>
        <span class="row-sub">Not found: ${t.entity}. Check the entity id.</span>
      </div>`;
    const i = k(e.attributes.current_temperature), n = k(e.attributes.temperature), o = this.valve(t, e), r = this.sensorNumber(t.battery);
    return h`<button class="row" @click=${() => this.go({ radiator: t.entity.split(".")[1] })}>
      <span class="row-name">
        ${s}
        ${r !== null && r < 20 ? h`<span class="battery" title=${`Battery low (${r}%)`} aria-label=${`Battery low, ${r}%`}>${is}</span>` : c}
      </span>
      <span class="row-temps">
        <span class="row-cur">${i === null ? "–" : w(i)}</span>
        <span class="row-sub">${n === null ? "" : `set ${w(n)}`}</span>
      </span>
      <span class="valve ${o.noHeat ? "no-heat" : ""}" title=${Ft(o)}>
        <span style=${`width: ${o.pct ?? 0}%`}></span>
      </span>
    </button>`;
  }
  /**
   * TPI is running the boiler: whether it's giving it heat this cycle, and why the Hive remote shows a different
   * temperature from the dial (TPI sets the receiver above the target to run the boiler, below it to rest it).
   */
  renderTpi(t) {
    const e = t.setpoint !== null && t.setpoint > t.target, s = `TPI is running the boiler for ${t.demand}% of each cycle to keep the room at ${w(t.target)}. It sets the receiver above the target to run the boiler and below it to rest it, so the Hive remote shows that setting rather than the target.`;
    return h`<p class="tpi-line" title=${s}>
      <span class="tpi-badge">TPI</span>
      ${e ? "Heating" : "Resting"} · ${t.demand}%${t.setpoint !== null ? h` · <span class="tpi-remote">remote shows ${w(t.setpoint)}</span>` : c}
    </p>`;
  }
  renderRadiator(t) {
    const e = this.hass.states[t.entity];
    if (!e) return h`<p class="notice">Not found: ${t.entity}. Check the entity id in the panel config.</p>`;
    const s = this.valve(t, e), i = this.sensorNumber(t.battery), n = e.attributes.preset_mode ?? e.state;
    return h`
      <section class="hero">
        <heating-dial
          .min=${k(e.attributes.min_temp) ?? 5}
          .max=${k(e.attributes.max_temp) ?? 30}
          .target=${k(e.attributes.temperature)}
          .current=${k(e.attributes.current_temperature)}
          .off=${e.state === "off"}
          .active=${e.attributes.hvac_action === "heating"}
          .label=${Ze(n)}
          @dial-change=${(o) => {
      const r = o.detail.value;
      this.command(
        () => this.hass.callService("climate", "set_temperature", { temperature: r }, { entity_id: t.entity }).then(() => {
        }),
        `${this.radiatorName(t)} set to ${w(r)}`
      );
    }}
        ></heating-dial>
      </section>
      <dl class="facts">
        <div><dt>Valve</dt><dd class=${s.noHeat ? "no-heat" : ""} title=${Ft(s)}>${Ke(s)}</dd></div>
        <div><dt>Battery</dt><dd class=${i !== null && i < 20 ? "low" : ""}>${i === null ? "–" : `${i}%`}</dd></div>
      </dl>
    `;
  }
};
Et.styles = te`
    :host {
      --dusk: #1b2431;
      --slate: #273345;
      --slate-2: #33415a;
      --mist: #e9eef4;
      --haze: #93a1b4;
      --porch: #f5b83d;
      --on-porch: #2a1d00; /* text on the amber accent */
      --error-text: #ffb4ae;
      /* Temperature cue, kept soft so amber stays the one thing that stands out */
      --cool: #7d9cc4;
      --mild: #b8ab9b;
      --warm: #d4875f;
      display: block;
      /* Home Assistant's panel container has no set height, so 100% would stop at the content. */
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--dusk);
      color: var(--mist);
      font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    /* Follow the user's Home Assistant theme. */
    :host([theme="ha"]) {
      --dusk: var(--primary-background-color, #111111);
      --slate: var(--secondary-background-color, #282828);
      --slate-2: var(--divider-color, rgba(127, 127, 127, 0.3));
      --mist: var(--primary-text-color, #e1e1e1);
      --haze: var(--secondary-text-color, #9b9b9b);
      --porch: var(--accent-color, #ff9800);
      --on-porch: var(--text-accent-color, var(--text-primary-color, #ffffff));
      --error-text: var(--error-color, #db4437);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
    }
    .app {
      max-width: 560px;
      margin: 0 auto;
      padding: 0 calc(16px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom))
        calc(16px + env(safe-area-inset-left));
    }
    .kiosk-gap {
      height: calc(12px + env(safe-area-inset-top));
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: calc(12px + env(safe-area-inset-top)) 0 12px;
    }
    h1 {
      flex: 1;
      margin: 0;
      font-size: 1.375rem;
      font-weight: 650;
      letter-spacing: -0.01em;
    }
    h2 {
      margin: 24px 0 8px;
      font-size: 1.0625rem;
      font-weight: 650;
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
      text-align: inherit;
    }
    button:focus-visible {
      outline: 3px solid var(--porch);
      outline-offset: 3px;
    }
    .round {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--slate);
    }
    .round svg {
      width: 22px;
      height: 22px;
    }

    .notices {
      display: grid;
      gap: 8px;
      margin-bottom: 12px;
    }
    .notice {
      margin: 0;
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--slate);
      line-height: 1.45;
    }
    .notices > * {
      min-width: 0; /* let a long snippet scroll instead of widening the page */
    }
    .notice p {
      margin: 0;
    }
    .notice pre {
      margin: 10px 0 0;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--dusk);
      font-size: 0.8125rem;
      overflow-x: auto;
      user-select: all;
    }
    .notice.attention {
      box-shadow: inset 0 0 0 2px var(--porch);
    }
    .notice.setup {
      margin-top: calc(24px + env(safe-area-inset-top));
    }
    .empty {
      margin: 8px 0 0;
      color: var(--haze);
      line-height: 1.45;
    }

    .hero {
      padding-top: 4px;
    }
    .running {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 24px;
      margin: 4px 0 0;
      color: var(--haze);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .running.on {
      color: var(--porch);
    }
    .running svg {
      width: 18px;
      height: 18px;
    }

    /* TPI is running the boiler (see renderTpi). */
    .tpi-line {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
      margin: 6px 0 0;
      color: var(--haze);
      font-size: 0.875rem;
      font-weight: 500;
    }
    .tpi-badge {
      padding: 1px 8px;
      border: 1px solid var(--porch);
      border-radius: 999px;
      /* The accent marks it, but the text is the theme's own, so it reads on light themes too (a yellow accent
         on white was too faint). */
      background: color-mix(in srgb, var(--porch) 22%, transparent);
      color: var(--mist);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .tpi-remote {
      white-space: nowrap;
    }

    .modes {
      display: grid;
      grid-template-columns: repeat(var(--n), 1fr);
      gap: 8px;
      margin-top: 20px;
    }
    .mode {
      height: 56px;
      border-radius: 28px;
      background: var(--slate);
      color: var(--haze);
      font-weight: 650;
      text-align: center;
    }
    .mode[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .mode:disabled {
      cursor: default;
    }
    .mode:disabled:not([aria-pressed="true"]) {
      opacity: 0.6;
    }

    .away-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 52px;
      margin-top: 8px;
      border-radius: 26px;
      background: var(--slate);
      color: var(--haze);
      font-weight: 650;
    }
    .away-button[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .away-button:disabled {
      cursor: default;
    }
    .away-button:disabled:not([aria-pressed="true"]) {
      opacity: 0.6;
    }
    svg.plane {
      width: 20px;
      height: 20px;
      vertical-align: -4px;
    }
    .date-pick {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      color: var(--haze);
      font-size: 0.875rem;
      font-weight: 600;
    }
    .date-pick input {
      height: 44px;
      padding: 0 12px;
      border: 0;
      border-radius: 12px;
      background: var(--slate-2);
      color: var(--mist);
      font: inherit;
      color-scheme: dark;
    }
    :host([theme="ha"]) .date-pick input {
      color-scheme: light dark;
    }
    .card {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 14px 16px 12px;
      border-radius: 18px;
      background: var(--slate);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-weight: 650;
    }
    .card-head svg {
      width: 20px;
      height: 20px;
      color: var(--haze);
    }

    .bar {
      position: relative;
      display: block;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      background: var(--slate-2);
    }
    .card .bar {
      height: 18px;
      border-radius: 9px;
    }
    .bar.unknown {
      background: repeating-linear-gradient(
        -45deg,
        var(--slate-2) 0 6px,
        transparent 6px 12px
      );
    }
    .seg {
      position: absolute;
      top: 0;
      bottom: 0;
    }
    .now {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      margin-left: -1px;
      background: var(--mist);
    }
    .ticks {
      position: relative;
      display: block;
      height: 18px;
      margin-top: 4px;
      color: var(--haze);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    .ticks span {
      position: absolute;
      transform: translateX(-50%);
    }
    .ticks span:first-child {
      transform: none;
    }
    .ticks span:last-child {
      transform: translateX(-100%);
    }

    .week {
      display: grid;
      gap: 4px;
    }
    .day-row {
      display: grid;
      grid-template-columns: 3.25em 1fr;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 10px;
      border-radius: 12px;
      background: transparent;
    }
    .day-row[aria-pressed="true"] {
      background: var(--slate);
    }
    .day-name {
      color: var(--haze);
      font-weight: 600;
    }
    .day-row[aria-pressed="true"] .day-name {
      color: var(--mist);
    }
    .ticks-row {
      min-height: 0;
    }
    .points {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .point {
      display: grid;
      grid-template-columns: 4.5em 14px 1fr 20px;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 52px;
      padding: 0 14px;
      border-radius: 12px;
      background: var(--slate);
      font-weight: 600;
    }
    .point:disabled {
      cursor: default;
    }
    .point svg {
      width: 20px;
      height: 20px;
      color: var(--haze);
    }
    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      margin-left: 5px;
      border-radius: 50%;
      background: var(--porch);
      vertical-align: middle;
    }
    .card.tidy {
      cursor: default;
    }
    .card.tidy p {
      margin: 0 0 12px;
      color: var(--haze);
      line-height: 1.45;
    }
    .card.tidy .secondary {
      width: 100%;
      background: var(--slate-2);
    }
    .point-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .secondary {
      height: 52px;
      border-radius: 26px;
      background: var(--slate);
      font-weight: 650;
      text-align: center;
    }
    .secondary:disabled,
    .link:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .link {
      display: block;
      margin: 20px auto 0;
      padding: 10px;
      background: none;
      color: var(--haze);
      text-align: center;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .link.danger {
      color: var(--error-text);
    }
    .schedule.has-save-bar {
      padding-bottom: 96px;
    }
    .save-bar {
      position: fixed;
      left: 50%;
      bottom: 0;
      z-index: 5;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 8px;
      width: min(560px, 100%);
      transform: translateX(-50%);
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      background: var(--dusk);
      box-shadow: 0 -8px 24px rgb(0 0 0 / 0.35);
    }
    .save-bar .primary {
      height: 56px;
      margin: 0;
    }
    .save-bar .secondary {
      height: 56px;
      background: var(--slate);
    }
    .chips.two {
      grid-template-columns: 1fr 1fr;
      margin-bottom: 12px;
    }
    .time-stepper {
      gap: 10px;
    }
    .round.small {
      width: 48px;
      height: 48px;
      font-size: 0.8125rem;
      font-weight: 650;
    }
    .stepper.dimmed .stepper-value {
      color: var(--haze);
    }
    .time {
      font-variant-numeric: tabular-nums;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--slate-2);
    }
    .retry {
      margin-top: 12px;
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--mist);
      color: var(--dusk);
      font-weight: 600;
    }

    .rows {
      display: grid;
      gap: 8px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 4px 12px;
      width: 100%;
      min-height: 64px;
      padding: 12px 16px;
      border-radius: 16px;
      background: var(--slate);
    }
    .row-name {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 650;
    }
    .row-temps {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-variant-numeric: tabular-nums;
    }
    .row-cur {
      font-size: 1.25rem;
      font-weight: 650;
    }
    .row-sub {
      color: var(--haze);
      font-size: 0.875rem;
    }
    .row.missing .row-sub {
      grid-column: 1 / -1;
    }
    .battery {
      display: inline-grid;
      color: var(--porch);
    }
    .battery svg {
      width: 18px;
      height: 18px;
    }
    .valve {
      grid-column: 1 / -1;
      display: block;
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      background: var(--slate-2);
    }
    .valve span {
      display: block;
      height: 100%;
      background: var(--warm);
    }
    /* Open, but the boiler's off: no heat is reaching it. */
    .valve.no-heat span {
      background: var(--haze);
    }

    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 24px 0 0;
    }
    .facts div {
      padding: 12px 16px;
      border-radius: 16px;
      background: var(--slate);
    }
    .facts dt {
      color: var(--haze);
      font-size: 0.875rem;
    }
    .facts dd {
      margin: 2px 0 0;
      font-size: 1.125rem;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .facts dd.low {
      color: var(--porch);
    }
    /* Open, but the boiler's off: no heat is reaching it (as the valve bar). */
    .facts dd.no-heat {
      color: var(--haze);
      font-weight: 500;
    }

    .notice.with-action {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .notice.with-action span {
      flex: 1;
    }
    .close {
      flex: none;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--slate-2);
      font-weight: 600;
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: calc(96px + env(safe-area-inset-bottom));
      z-index: 20;
      transform: translateX(-50%);
      width: max-content;
      max-width: min(528px, calc(100% - 32px));
      padding: 10px 16px;
      border-radius: 18px;
      background: var(--mist);
      color: var(--dusk);
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.4;
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.3);
    }
    .toast.error {
      background: var(--slate);
      color: var(--mist);
      box-shadow: inset 0 0 0 2px var(--porch), 0 4px 16px rgb(0 0 0 / 0.3);
    }

    .sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgb(0 0 0 / 0.6);
    }
    .sheet {
      width: 100%;
      max-width: 560px;
      padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
      border-radius: 20px 20px 0 0;
      background: var(--slate);
    }
    .sheet-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0 8px;
      font-size: 1.0625rem;
      font-weight: 650;
    }
    .sheet-label {
      margin: 16px 0 8px;
      color: var(--haze);
      font-size: 0.875rem;
      font-weight: 600;
    }
    .sheet-text {
      margin: 8px 0 16px;
      line-height: 1.45;
    }
    .chips {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .chip {
      height: 48px;
      border-radius: 24px;
      background: var(--slate-2);
      font-weight: 600;
      text-align: center;
    }
    .chip[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }
    .stepper .round {
      width: 56px;
      height: 56px;
      background: var(--slate-2);
    }
    .stepper .round:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .stepper-value {
      min-width: 3.5ch;
      font-size: 2rem;
      font-weight: 600;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .primary {
      display: block;
      width: 100%;
      height: 72px;
      margin-top: 20px;
      border-radius: 36px;
      background: var(--porch);
      color: var(--on-porch);
      font-size: 1.125rem;
      font-weight: 650;
      text-align: center;
    }
    .primary:disabled {
      opacity: 0.45;
      cursor: default;
    }
    @media (prefers-reduced-motion: no-preference) {
      .sheet {
        animation: rise 0.2s ease-out;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0.6;
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .mode,
      .day-row {
        transition: background 0.2s, color 0.2s;
      }
    }
  `;
let g = Et;
y([
  $({ attribute: !1 })
], g.prototype, "hass");
y([
  $({ attribute: !1 })
], g.prototype, "panel");
y([
  $({ type: Boolean })
], g.prototype, "narrow");
y([
  b()
], g.prototype, "view");
y([
  b()
], g.prototype, "kiosk");
y([
  b()
], g.prototype, "scheduleDay");
y([
  b()
], g.prototype, "tick");
y([
  b()
], g.prototype, "boostOpen");
y([
  b()
], g.prototype, "boostMinutes");
y([
  b()
], g.prototype, "boostTemp");
y([
  b()
], g.prototype, "awayOpen");
y([
  b()
], g.prototype, "awayDay");
y([
  b()
], g.prototype, "awayTime");
y([
  b()
], g.prototype, "awayTemp");
y([
  b()
], g.prototype, "toast");
y([
  b()
], g.prototype, "toastError");
y([
  b()
], g.prototype, "chosen");
y([
  b()
], g.prototype, "draft");
y([
  b()
], g.prototype, "editing");
y([
  b()
], g.prototype, "copyDays");
y([
  b()
], g.prototype, "frozen");
customElements.get("heating-panel") || customElements.define("heating-panel", g);
export {
  g as HeatingPanel
};
