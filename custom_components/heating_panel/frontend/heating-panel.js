/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const rt = globalThis, St = rt.ShadowRoot && (rt.ShadyCSS === void 0 || rt.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, At = Symbol(), Dt = /* @__PURE__ */ new WeakMap();
let ie = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== At) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (St && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = Dt.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && Dt.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const fe = (o) => new ie(typeof o == "string" ? o : o + "", void 0, At), ne = (o, ...t) => {
  const e = o.length === 1 ? o[0] : t.reduce((s, i, n) => s + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + o[n + 1], o[0]);
  return new ie(e, o, At);
}, ge = (o, t) => {
  if (St) o.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), i = rt.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = e.cssText, o.appendChild(s);
  }
}, Pt = St ? (o) => o : (o) => o instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return fe(e);
})(o) : o;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: ye, defineProperty: be, getOwnPropertyDescriptor: we, getOwnPropertyNames: ve, getOwnPropertySymbols: $e, getPrototypeOf: ke } = Object, D = globalThis, Ht = D.trustedTypes, xe = Ht ? Ht.emptyScript : "", _e = D.reactiveElementPolyfillSupport, K = (o, t) => o, dt = { toAttribute(o, t) {
  switch (t) {
    case Boolean:
      o = o ? xe : null;
      break;
    case Object:
    case Array:
      o = o == null ? o : JSON.stringify(o);
  }
  return o;
}, fromAttribute(o, t) {
  let e = o;
  switch (t) {
    case Boolean:
      e = o !== null;
      break;
    case Number:
      e = o === null ? null : Number(o);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(o);
      } catch {
        e = null;
      }
  }
  return e;
} }, Et = (o, t) => !ye(o, t), Nt = { attribute: !0, type: String, converter: dt, reflect: !1, useDefault: !1, hasChanged: Et };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), D.litPropertyMetadata ?? (D.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let j = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = Nt) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(), i = this.getPropertyDescriptor(t, s, e);
      i !== void 0 && be(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: i, set: n } = we(this.prototype, t) ?? { get() {
      return this[e];
    }, set(a) {
      this[e] = a;
    } };
    return { get: i, set(a) {
      const r = i?.call(this);
      n?.call(this, a), this.requestUpdate(t, r, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? Nt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(K("elementProperties"))) return;
    const t = ke(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(K("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(K("properties"))) {
      const e = this.properties, s = [...ve(e), ...$e(e)];
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
      for (const i of s) e.unshift(Pt(i));
    } else t !== void 0 && e.push(Pt(t));
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
    return ge(t, this.constructor.elementStyles), t;
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
      const n = s.getPropertyOptions(i), a = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : dt;
      this._$Em = i;
      const r = a.fromAttribute(e, n.type);
      this[i] = r ?? this._$Ej?.get(i) ?? r, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = !1, n) {
    if (t !== void 0) {
      const a = this.constructor;
      if (i === !1 && (n = this[t]), s ?? (s = a.getPropertyOptions(t)), !((s.hasChanged ?? Et)(n, e) || s.useDefault && s.reflect && n === this._$Ej?.get(t) && !this.hasAttribute(a._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: i, wrapped: n }, a) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, a ?? e ?? this[t]), n !== !0 || a !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), i === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
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
        const { wrapped: a } = n, r = this[i];
        a !== !0 || this._$AL.has(i) || r === void 0 || this.C(i, void 0, n, r);
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
j.elementStyles = [], j.shadowRootOptions = { mode: "open" }, j[K("elementProperties")] = /* @__PURE__ */ new Map(), j[K("finalized")] = /* @__PURE__ */ new Map(), _e?.({ ReactiveElement: j }), (D.reactiveElementVersions ?? (D.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const X = globalThis, zt = (o) => o, ut = X.trustedTypes, Rt = ut ? ut.createPolicy("lit-html", { createHTML: (o) => o }) : void 0, oe = "$lit$", M = `lit$${Math.random().toFixed(9).slice(2)}$`, ae = "?" + M, Te = `<${ae}>`, B = document, Z = () => B.createComment(""), tt = (o) => o === null || typeof o != "object" && typeof o != "function", Ct = Array.isArray, Se = (o) => Ct(o) || typeof o?.[Symbol.iterator] == "function", yt = `[ 	
\f\r]`, J = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Bt = /-->/g, Ut = />/g, P = RegExp(`>|${yt}(?:([^\\s"'>=/]+)(${yt}*=${yt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Lt = /'/g, It = /"/g, re = /^(?:script|style|textarea|title)$/i, le = (o) => (t, ...e) => ({ _$litType$: o, strings: t, values: e }), h = le(1), bt = le(2), W = Symbol.for("lit-noChange"), d = Symbol.for("lit-nothing"), jt = /* @__PURE__ */ new WeakMap(), R = B.createTreeWalker(B, 129);
function he(o, t) {
  if (!Ct(o) || !o.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Rt !== void 0 ? Rt.createHTML(t) : t;
}
const Ae = (o, t) => {
  const e = o.length - 1, s = [];
  let i, n = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", a = J;
  for (let r = 0; r < e; r++) {
    const l = o[r];
    let c, m, u = -1, v = 0;
    for (; v < l.length && (a.lastIndex = v, m = a.exec(l), m !== null); ) v = a.lastIndex, a === J ? m[1] === "!--" ? a = Bt : m[1] !== void 0 ? a = Ut : m[2] !== void 0 ? (re.test(m[2]) && (i = RegExp("</" + m[2], "g")), a = P) : m[3] !== void 0 && (a = P) : a === P ? m[0] === ">" ? (a = i ?? J, u = -1) : m[1] === void 0 ? u = -2 : (u = a.lastIndex - m[2].length, c = m[1], a = m[3] === void 0 ? P : m[3] === '"' ? It : Lt) : a === It || a === Lt ? a = P : a === Bt || a === Ut ? a = J : (a = P, i = void 0);
    const E = a === P && o[r + 1].startsWith("/>") ? " " : "";
    n += a === J ? l + Te : u >= 0 ? (s.push(c), l.slice(0, u) + oe + l.slice(u) + M + E) : l + M + (u === -2 ? r : E);
  }
  return [he(o, n + (o[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class et {
  constructor({ strings: t, _$litType$: e }, s) {
    let i;
    this.parts = [];
    let n = 0, a = 0;
    const r = t.length - 1, l = this.parts, [c, m] = Ae(t, e);
    if (this.el = et.createElement(c, s), R.currentNode = this.el.content, e === 2 || e === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (i = R.nextNode()) !== null && l.length < r; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const u of i.getAttributeNames()) if (u.endsWith(oe)) {
          const v = m[a++], E = i.getAttribute(u).split(M), nt = /([.?@])?(.*)/.exec(v);
          l.push({ type: 1, index: n, name: nt[2], strings: E, ctor: nt[1] === "." ? Ce : nt[1] === "?" ? Me : nt[1] === "@" ? Oe : gt }), i.removeAttribute(u);
        } else u.startsWith(M) && (l.push({ type: 6, index: n }), i.removeAttribute(u));
        if (re.test(i.tagName)) {
          const u = i.textContent.split(M), v = u.length - 1;
          if (v > 0) {
            i.textContent = ut ? ut.emptyScript : "";
            for (let E = 0; E < v; E++) i.append(u[E], Z()), R.nextNode(), l.push({ type: 2, index: ++n });
            i.append(u[v], Z());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ae) l.push({ type: 2, index: n });
      else {
        let u = -1;
        for (; (u = i.data.indexOf(M, u + 1)) !== -1; ) l.push({ type: 7, index: n }), u += M.length - 1;
      }
      n++;
    }
  }
  static createElement(t, e) {
    const s = B.createElement("template");
    return s.innerHTML = t, s;
  }
}
function V(o, t, e = o, s) {
  if (t === W) return t;
  let i = s !== void 0 ? e._$Co?.[s] : e._$Cl;
  const n = tt(t) ? void 0 : t._$litDirective$;
  return i?.constructor !== n && (i?._$AO?.(!1), n === void 0 ? i = void 0 : (i = new n(o), i._$AT(o, e, s)), s !== void 0 ? (e._$Co ?? (e._$Co = []))[s] = i : e._$Cl = i), i !== void 0 && (t = V(o, i._$AS(o, t.values), i, s)), t;
}
let Ee = class {
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
    const { el: { content: e }, parts: s } = this._$AD, i = (t?.creationScope ?? B).importNode(e, !0);
    R.currentNode = i;
    let n = R.nextNode(), a = 0, r = 0, l = s[0];
    for (; l !== void 0; ) {
      if (a === l.index) {
        let c;
        l.type === 2 ? c = new st(n, n.nextSibling, this, t) : l.type === 1 ? c = new l.ctor(n, l.name, l.strings, this, t) : l.type === 6 && (c = new De(n, this, t)), this._$AV.push(c), l = s[++r];
      }
      a !== l?.index && (n = R.nextNode(), a++);
    }
    return R.currentNode = B, i;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
};
class st {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, e, s, i) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = i?.isConnected ?? !0;
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
    t = V(this, t, e), tt(t) ? t === d || t == null || t === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : t !== this._$AH && t !== W && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Se(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== d && tt(this._$AH) ? this._$AA.nextSibling.data = t : this.T(B.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: e, _$litType$: s } = t, i = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = et.createElement(he(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === i) this._$AH.p(e);
    else {
      const n = new Ee(i, this), a = n.u(this.options);
      n.p(e), this.T(a), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = jt.get(t.strings);
    return e === void 0 && jt.set(t.strings, e = new et(t)), e;
  }
  k(t) {
    Ct(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, i = 0;
    for (const n of t) i === e.length ? e.push(s = new st(this.O(Z()), this.O(Z()), this, this.options)) : s = e[i], s._$AI(n), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t !== this._$AB; ) {
      const s = zt(t).nextSibling;
      zt(t).remove(), t = s;
    }
  }
  setConnected(t) {
    this._$AM === void 0 && (this._$Cv = t, this._$AP?.(t));
  }
}
class gt {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, n) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = n, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = d;
  }
  _$AI(t, e = this, s, i) {
    const n = this.strings;
    let a = !1;
    if (n === void 0) t = V(this, t, e, 0), a = !tt(t) || t !== this._$AH && t !== W, a && (this._$AH = t);
    else {
      const r = t;
      let l, c;
      for (t = n[0], l = 0; l < n.length - 1; l++) c = V(this, r[s + l], e, l), c === W && (c = this._$AH[l]), a || (a = !tt(c) || c !== this._$AH[l]), c === d ? t = d : t !== d && (t += (c ?? "") + n[l + 1]), this._$AH[l] = c;
    }
    a && !i && this.j(t);
  }
  j(t) {
    t === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Ce extends gt {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === d ? void 0 : t;
  }
}
class Me extends gt {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== d);
  }
}
class Oe extends gt {
  constructor(t, e, s, i, n) {
    super(t, e, s, i, n), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = V(this, t, e, 0) ?? d) === W) return;
    const s = this._$AH, i = t === d && s !== d || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, n = t !== d && (s === d || i);
    i && this.element.removeEventListener(this.name, this, s), n && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class De {
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
const Pe = X.litHtmlPolyfillSupport;
Pe?.(et, st), (X.litHtmlVersions ?? (X.litHtmlVersions = [])).push("3.3.3");
const He = (o, t, e) => {
  const s = e?.renderBefore ?? t;
  let i = s._$litPart$;
  if (i === void 0) {
    const n = e?.renderBefore ?? null;
    s._$litPart$ = i = new st(t.insertBefore(Z(), n), n, void 0, e ?? {});
  }
  return i._$AI(o), i;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const G = globalThis;
class F extends j {
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = He(e, this.renderRoot, this.renderOptions);
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
F._$litElement$ = !0, F.finalized = !0, G.litElementHydrateSupport?.({ LitElement: F });
const Ne = G.litElementPolyfillSupport;
Ne?.({ LitElement: F });
(G.litElementVersions ?? (G.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ze = { attribute: !0, type: String, converter: dt, reflect: !1, hasChanged: Et }, Re = (o = ze, t, e) => {
  const { kind: s, metadata: i } = e;
  let n = globalThis.litPropertyMetadata.get(i);
  if (n === void 0 && globalThis.litPropertyMetadata.set(i, n = /* @__PURE__ */ new Map()), s === "setter" && ((o = Object.create(o)).wrapped = !0), n.set(e.name, o), s === "accessor") {
    const { name: a } = e;
    return { set(r) {
      const l = t.get.call(this);
      t.set.call(this, r), this.requestUpdate(a, l, o, !0, r);
    }, init(r) {
      return r !== void 0 && this.C(a, void 0, o, r), r;
    } };
  }
  if (s === "setter") {
    const { name: a } = e;
    return function(r) {
      const l = this[a];
      t.call(this, r), this.requestUpdate(a, l, o, !0, r);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function k(o) {
  return (t, e) => typeof e == "object" ? Re(o, t, e) : ((s, i, n) => {
    const a = i.hasOwnProperty(n);
    return i.constructor.createProperty(n, s), a ? Object.getOwnPropertyDescriptor(i, n) : void 0;
  })(o, t, e);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function y(o) {
  return k({ ...o, state: !0, attribute: !1 });
}
var Be = Object.defineProperty, _ = (o, t, e, s) => {
  for (var i = void 0, n = o.length - 1, a; n >= 0; n--)
    (a = o[n]) && (i = a(t, e, i) || i);
  return i && Be(t, e, i), i;
};
const H = 135, C = 270, q = 120, pt = 100, lt = (o, t = 0, e = 1) => Math.min(e, Math.max(t, o)), mt = (o, t = pt) => {
  const e = o * Math.PI / 180;
  return { x: q + t * Math.cos(e), y: q + t * Math.sin(e) };
}, qt = (o, t) => {
  const e = mt(o), s = mt(t), i = t - o > 180 ? 1 : 0;
  return `M ${e.x.toFixed(2)} ${e.y.toFixed(2)} A ${pt} ${pt} 0 ${i} 1 ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
}, w = (o) => `${Number.isInteger(o) ? o.toFixed(0) : o.toFixed(1)}°`, Ue = (o) => Math.round(lt((o - 15) / 4) * 100);
function kt(o) {
  const t = Ue(o);
  return t <= 50 ? `color-mix(in oklab, var(--mild) ${t * 2}%, var(--cool))` : `color-mix(in oklab, var(--warm) ${(t - 50) * 2}%, var(--mild))`;
}
const Le = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, Ie = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, Mt = class Mt extends F {
  constructor() {
    super(...arguments), this.min = 5, this.max = 32, this.step = 0.5, this.target = null, this.current = null, this.off = !1, this.active = !1, this.readonly = !1, this.label = "", this.note = "", this.attention = !1, this.pending = null, this.dragging = !1, this.onPointerDown = (t) => {
      if (!this.interactive) return;
      const e = t.currentTarget.getBoundingClientRect(), s = (t.clientX - e.left) / e.width * 240 - q, i = (t.clientY - e.top) / e.height * 240 - q;
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
    const e = t.currentTarget.getBoundingClientRect(), s = (t.clientX - e.left) / e.width * 240 - q, i = (t.clientY - e.top) / e.height * 240 - q;
    let n = (Math.atan2(i, s) * 180 / Math.PI - H + 720) % 360;
    return n > C && (n = n < C + (360 - C) / 2 ? C : 0), this.min + n / C * (this.max - this.min);
  }
  render() {
    const t = this.pending ?? this.target, e = t === null || this.off ? null : lt((t - this.min) / (this.max - this.min)), s = e === null ? null : H + C * e, i = s === null ? null : mt(s), n = this.current === null ? null : mt(H + C * lt((this.current - this.min) / (this.max - this.min))), a = this.active ? "var(--porch)" : kt(t ?? this.min);
    return h`
      <div class="dial ${this.active ? "active" : ""}" style=${`--tone: ${a}`}>
        <svg
          viewBox="0 0 240 240"
          class=${this.interactive ? "interactive" : ""}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
        >
          <path class="track" d=${qt(H, H + C)} />
          ${s !== null && s - H > 0.5 ? bt`<path class="level" d=${qt(H, s)} />` : d}
          ${n ? bt`<circle class="room" cx=${n.x} cy=${n.y} r="4" />` : d}
          ${i ? bt`<circle
                class="thumb"
                cx=${i.x}
                cy=${i.y}
                r="11"
                role="slider"
                tabindex=${this.interactive ? "0" : "-1"}
                aria-label="Target temperature"
                aria-valuemin=${this.min}
                aria-valuemax=${this.max}
                aria-valuenow=${t ?? d}
                aria-readonly=${this.interactive ? "false" : "true"}
                @keydown=${this.onKey}
              />` : d}
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
          ${Le}
        </button>
        <button
          class="step plus"
          ?disabled=${!this.interactive}
          title="Raise"
          aria-label="Raise the temperature"
          @click=${() => this.nudge(1)}
        >
          ${Ie}
        </button>
      </div>
    `;
  }
};
Mt.styles = ne`
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
let $ = Mt;
_([
  k({ type: Number })
], $.prototype, "min");
_([
  k({ type: Number })
], $.prototype, "max");
_([
  k({ type: Number })
], $.prototype, "step");
_([
  k({ attribute: !1 })
], $.prototype, "target");
_([
  k({ attribute: !1 })
], $.prototype, "current");
_([
  k({ type: Boolean })
], $.prototype, "off");
_([
  k({ type: Boolean })
], $.prototype, "active");
_([
  k({ type: Boolean })
], $.prototype, "readonly");
_([
  k()
], $.prototype, "label");
_([
  k()
], $.prototype, "note");
_([
  k({ type: Boolean })
], $.prototype, "attention");
_([
  y()
], $.prototype, "pending");
customElements.get("heating-dial") || customElements.define("heating-dial", $);
const p = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], A = (o) => o <= 1, O = (o) => (o.getDay() + 6) % 7, it = (o) => [...o].sort((t, e) => t.time - e.time);
function T(o) {
  const t = [];
  for (const e of it(o))
    (!t.length || t[t.length - 1].setpoint !== e.setpoint) && t.push(e);
  return t;
}
function ce(o, t) {
  const e = o[p[(t + 6) % 7]];
  if (!e?.length) return null;
  const s = it(e);
  return s[s.length - 1].setpoint;
}
function je(o, t) {
  const e = o[p[t]];
  if (!e) return [];
  const s = [];
  let i = 0, n = ce(o, t);
  for (const a of T(e))
    a.time > i && s.push({ start: i, end: a.time, setpoint: n }), i = a.time, n = a.setpoint;
  return s.push({ start: i, end: 24 * 60, setpoint: n }), s.reduce((a, r) => {
    const l = a[a.length - 1];
    return l && l.setpoint === r.setpoint ? l.end = r.end : a.push({ ...r }), a;
  }, []);
}
function de(o, t, e) {
  const s = o[p[t]];
  if (!s) return null;
  let i = ce(o, t);
  for (const n of it(s)) {
    if (n.time > e) break;
    i = n.setpoint;
  }
  return i;
}
function qe(o, t) {
  const e = O(t), s = t.getHours() * 60 + t.getMinutes(), i = de(o, e, s);
  if (i === null) return null;
  for (let n = 0; n < 7; n++) {
    const a = o[p[(e + n) % 7]];
    if (!a) return null;
    for (const r of it(a))
      if (!(n === 0 && r.time <= s) && r.setpoint !== i)
        return { dayOffset: n, time: r.time, setpoint: r.setpoint };
  }
  return null;
}
const Q = 6;
function ue(o) {
  const t = T(o);
  for (let e = t.length - 1; e >= 0 && t.length < Q; e--) {
    const s = t[e].time + 15, i = t[e + 1]?.time ?? 24 * 60;
    s < i && t.splice(e + 1, 0, { time: s, setpoint: t[e].setpoint });
  }
  for (; t.length && t.length < Q; ) {
    const e = t.findIndex((s, i) => (t[i + 1]?.time ?? 1440) - s.time >= 30);
    if (e < 0) break;
    t.splice(e + 1, 0, { time: t[e].time + 15, setpoint: t[e].setpoint });
  }
  return t;
}
function Ft(o, t) {
  const e = O(t), s = t.getHours() * 60 + t.getMinutes();
  for (let i = 0; i < 7; i++) {
    const n = o[p[(e + i) % 7]];
    if (!n) return null;
    const a = it(n).find((r) => i > 0 || r.time > s);
    if (a) return { dayOffset: i, time: a.time };
  }
  return null;
}
const Fe = (o) => `${String(Math.floor(o / 60)).padStart(2, "0")}:${String(o % 60).padStart(2, "0")}`, xt = (o = [], t = []) => JSON.stringify(T(o)) === JSON.stringify(T(t)), We = new Intl.DateTimeFormat(void 0, { hour: "2-digit", minute: "2-digit" }), N = (o) => We.format(new Date(2e3, 0, 1, Math.floor(o / 60), o % 60)), Ve = new Intl.DateTimeFormat(void 0, { weekday: "short" }), Je = new Intl.DateTimeFormat(void 0, { weekday: "long" }), ot = p.map((o, t) => Ve.format(new Date(2024, 0, 1 + t))), S = p.map((o, t) => Je.format(new Date(2024, 0, 1 + t))), _t = [
  "system_mode",
  "running_state",
  "occupied_heating_setpoint",
  "local_temperature",
  "temperature_setpoint_hold",
  "temperature_setpoint_hold_duration",
  "weekly_schedule"
], ft = "_heat", pe = 65535, Tt = 1440;
function me(o) {
  return _t.some((t) => `${t}${ft}` in o);
}
function Ye(o) {
  if (!me(o)) return o;
  const t = {};
  for (const [e, s] of Object.entries(o))
    if (e.endsWith(ft)) {
      const i = e.slice(0, -ft.length);
      _t.includes(i) && (t[i] = s);
    } else !e.endsWith("_water") && !_t.includes(e) && (t[e] = s);
  return t;
}
function Ke(o, t) {
  return t ? Object.fromEntries(Object.entries(o).map(([e, s]) => [`${e}${ft}`, s])) : o;
}
function Xe(o) {
  return { write: { cluster: "hvacThermostat", payload: { 36: { value: o, type: 33 } } } };
}
function ht(o) {
  return o === null || o === pe;
}
const at = 1, ct = 16, Ge = 360, Qe = 3, z = (o) => new Promise((t) => window.setTimeout(t, o)), Ze = (o) => o instanceof Error ? o.message : String(o?.message ?? o), U = "If a holiday is set on the remote (plane icon), cancel it there first.", Wt = "That's more than 24 hours away. For longer, set a holiday on the remote.";
class b extends Error {
}
const ts = {
  off: "Off",
  schedule: "Schedule",
  manual: "Manual",
  override: "a temporary change",
  boost: "Boost",
  away: "Away",
  unknown: "an unknown mode"
}, Vt = [
  "temperature_setpoint_hold_duration",
  "temperature_setpoint_hold",
  "system_mode",
  "running_state",
  "occupied_heating_setpoint",
  "local_temperature"
];
function Jt(o) {
  switch (o.system_mode) {
    case "off":
      return "off";
    case "emergency_heating":
      return "boost";
    case "heat": {
      if (o.temperature_setpoint_hold === !1) return "schedule";
      const t = o.temperature_setpoint_hold_duration;
      return o.temperature_setpoint_hold === !0 && t !== void 0 ? ht(t) ? "manual" : "schedule" : "unknown";
    }
    default:
      return "unknown";
  }
}
class es {
  /**
   * With `stateEntity`, the receiver's reports come from an MQTT sensor carrying them as attributes,
   * which any Home Assistant user may follow. Without it, the topic is watched directly, which
   * Home Assistant only allows administrators to do.
   */
  constructor(t, e, s, i) {
    this.getHass = t, this.topic = e, this.changed = s, this.stateEntity = i, this.report = {}, this.status = "connecting", this.errorText = "", this.week = {}, this.scheduleState = "idle", this.retainedCommand = !1, this.busy = !1, this.unexpected = "", this.dualChannel = !1, this.holdEnd = null, this.waiters = [], this.unsubs = [], this.stopped = !1, this.entityAttrs = {}, this.onState = (n) => {
      let a;
      try {
        a = JSON.parse(n.payload);
      } catch {
        return;
      }
      a && typeof a == "object" && this.onReport(a);
    }, this.onEntity = (n) => {
      const a = this.stateEntity, r = n.a?.[a];
      r && (this.entityAttrs = { ...r.a ?? {} }, this.onReport(this.entityAttrs, !1));
      const l = n.c?.[a];
      if (l) {
        const c = l["+"]?.a;
        c && (this.entityAttrs = { ...this.entityAttrs, ...c });
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
    this.get(Object.fromEntries(Vt.map((t) => [t, ""])));
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
    return de(this.week, O(t), t.getHours() * 60 + t.getMinutes());
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
    return e && Jt(this.report) === "schedule" && (t === e.setpoint || t === e.target) ? e.target : t;
  }
  get mode() {
    const t = Jt(this.report), e = this.scheduledNow, s = this.target;
    if (t === "schedule" && e !== null && s !== void 0 && s !== e) return "override";
    if (t === "boost") {
      const i = this.minutesLeft;
      if (s !== void 0 && s <= ct || i !== null && i > Ge) return "away";
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
    return t === void 0 || ht(t) || !this.report.temperature_setpoint_hold ? null : this.holdEnd;
  }
  get scheduleDays() {
    return p.filter((t) => this.week[t]).length;
  }
  // ---- Commands. Sequences and why: docs/receiver-protocol.md ----
  /** Back to the receiver's own schedule. */
  toSchedule() {
    return this.run("schedule", async () => {
      if (await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }), !await this.until("temperature_setpoint_hold", (t) => t === !1))
        throw new b(`The receiver didn't go back to its schedule. ${U}`);
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
   * down and goes back to its schedule by itself, without the remote or Home Assistant. Up to 24 hours
   * (MAX_HOLD): zigbee2mqtt won't pass a longer hold. Longer is the remote's holiday.
   */
  away(t, e) {
    const s = () => Math.round((t.getTime() - Date.now()) / 6e4);
    return s() < 1 ? Promise.reject(new b("Pick a time in the future.")) : s() > Tt ? Promise.reject(new b(Wt)) : this.timedBoost("away", s, e);
  }
  /**
   * The receiver sometimes takes the mode but not the length: it keeps "no end" (65534/65535), or 0 so the
   * boost ends at once (07:32 and 07:35 on 10 Oct; 5 of 7 tries took). So a try that doesn't take is
   * undone, back to Schedule, and sent again. `minutes` is asked afresh each try, so Away still ends on time.
   */
  timedBoost(t, e, s) {
    const i = typeof e == "number" ? () => e : e;
    return i() > Tt ? Promise.reject(new b(Wt)) : this.run(t, async () => {
      if (this.report.temperature_setpoint_hold !== !1) {
        if (await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }), !await this.until("temperature_setpoint_hold", (n) => n === !1))
          throw new b(`The receiver didn't get ready. ${U}`);
        await z(1e3);
      }
      for (let n = 1; ; n++) {
        const a = i();
        try {
          if (await this.set({
            system_mode: "emergency_heating",
            temperature_setpoint_hold_duration: a,
            temperature_setpoint_hold: !0,
            occupied_heating_setpoint: s
          }), !await this.until("system_mode", (r) => r === "emergency_heating"))
            throw new b("The receiver didn't switch to boost.");
          if (!await this.until("temperature_setpoint_hold_duration", (r) => typeof r == "number" && r >= 1 && r <= a, 3))
            throw new b("The receiver didn't take the boost length.");
          await this.until("occupied_heating_setpoint", (r) => r === s, 2) || await this.setpoint(s);
          return;
        } catch (r) {
          await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }).catch(() => {
          });
          const l = await this.until("temperature_setpoint_hold", (c) => c === !1);
          if (l && n < Qe) {
            await z(2e3);
            continue;
          }
          throw new b(
            `${Ze(r)} ${l ? "The heating is back on its schedule." : "Check the remote: it may still be boosting."}`
          );
        }
      }
    });
  }
  /**
   * Hold with no end, then the temperature on its own (the hold resets it to the schedule's). Like a boost's
   * length, "no end" is written before the hold switches on, from Schedule: a hold that's already on (a
   * temporary change counting down to the next slot) would keep its count. zigbee2mqtt 2.8 and later refuse 65535
   * by name, so it goes as a raw write (see z2m.ts).
   */
  manual(t) {
    return this.run("manual", async () => {
      if (this.report.temperature_setpoint_hold !== !1) {
        if (await this.set({ system_mode: "heat", temperature_setpoint_hold: !1 }), !await this.until("temperature_setpoint_hold", (e) => e === !1))
          throw new b(`The receiver didn't get ready. ${U}`);
        await z(1e3);
      }
      if (await this.set({ system_mode: "heat", ...Xe(pe), temperature_setpoint_hold: !0 }), !await this.until("temperature_setpoint_hold", (e) => e === !0))
        throw new b(`The receiver didn't switch to manual. ${U}`);
      if (!await this.until("temperature_setpoint_hold_duration", ht, 3))
        throw new b("The receiver took Manual with an end time, so it will go back to the schedule by itself.");
      await z(1e3), await this.setpoint(t);
    });
  }
  /**
   * Off, as the remote does it (17:20): mode off, hold off **and** the temperature set to 1, the
   * receiver's frost / "off" value (the remote's snowflake). Mode off alone left a Manual hold running
   * at its old temperature, and hold off alone left that temperature, so the receiver kept heating to it.
   */
  off() {
    return this.run("off", async () => {
      if (await this.set({ system_mode: "off", temperature_setpoint_hold: !1, occupied_heating_setpoint: at }), !await this.until("system_mode", (t) => t === "off"))
        throw new b(`The receiver didn't switch off. ${U}`);
      if (!await this.until("temperature_setpoint_hold", (t) => t === !1))
        throw new b(`The receiver is off but still holding a temperature, so it may keep heating. ${U}`);
      if (!await this.until("occupied_heating_setpoint", (t) => t === at, 2)) {
        await this.set({ occupied_heating_setpoint: at });
        const t = await this.readOne("occupied_heating_setpoint");
        if (t !== at)
          throw new b(`The receiver is off but still set to ${t}°, so it may keep heating. Turn it off on the remote.`);
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
        const a = JSON.stringify(t[n] ?? []);
        s.set(a, [...s.get(a) ?? [], n]);
      }
      for (const [n, a] of s) {
        const r = ue(JSON.parse(n)).map((l) => ({ heatSetpoint: l.setpoint, transitionTime: Fe(l.time) }));
        await this.set({ weekly_schedule: { dayofweek: a, transitions: r } });
      }
      this.week = {}, this.requestSchedule();
      for (let n = 0; n < 50 && this.scheduleState === "loading"; n++) await z(500);
      const i = e.filter((n) => !this.week[n] || !xt(this.week[n], t[n]));
      if (i.length)
        throw new b(
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
      return Promise.reject(new b("Choose Schedule, Manual or Boost first."));
    const s = e === "manual" || e === "boost" || e === "away" ? e : t === this.scheduledNow ? "schedule" : "override";
    return this.run(s, () => this.setpoint(t));
  }
  async setpoint(t) {
    for (let e = 0; e < 2; e++)
      if (await this.set({ occupied_heating_setpoint: t }), await this.until("occupied_heating_setpoint", (s) => s === t, 3)) return;
    throw new b("The receiver didn't take the new temperature.");
  }
  /** One command at a time; afterwards, watch for five minutes that the receiver stays put. */
  async run(t, e) {
    if (this.busy) throw new b("Still sending the last change. Try again in a moment.");
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
    await this.send("set", t), await z(1500);
  }
  /**
   * Publishes to the receiver's /set or /get topic. Since Home Assistant 2026.10 only administrators may
   * call mqtt.publish, so this goes through the heating_panel integration's service when it's installed.
   */
  async send(t, e) {
    const s = this.getHass();
    e = Ke(e, this.dualChannel);
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
      await z(1500);
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
    !this.dualChannel && me(t) && (this.dualChannel = !0, this.scheduleState !== "done" && this.requestSchedule());
    const s = Ye(t), i = this.report;
    for (const l of Vt) l in s && (i[l] = s[l]);
    if ("temperature_setpoint_hold_duration" in s || "temperature_setpoint_hold" in s) {
      const l = this.report.temperature_setpoint_hold_duration;
      if (!this.report.temperature_setpoint_hold || l === void 0 || ht(l)) this.holdEnd = null;
      else {
        const c = Date.now() + (l + 1) * 6e4;
        this.holdEnd = this.holdEnd === null ? c : Math.min(this.holdEnd, c);
      }
    }
    if (!e) {
      this.changed();
      return;
    }
    window.clearTimeout(this.silentTimer), this.status = "live";
    const n = this.waiters;
    this.waiters = [];
    for (const l of n) l(s);
    const a = this.mode;
    this.expect && !this.busy && a !== "unknown" && a !== this.expect.mode && (Date.now() < this.expect.until && (this.unexpected = `The receiver changed to ${ts[a]} shortly after your change. If nobody used the remote, it didn't keep the setting.`), this.expect = void 0);
    const r = s.weekly_schedule;
    if (r?.days && Array.isArray(r.transitions)) {
      const l = r.transitions.map((c) => ({ time: c.time, setpoint: c.heating_setpoint }));
      for (const c of r.days) p.includes(c) && (this.week[c] = l);
      this.week = { ...this.week }, this.scheduleState !== "done" && this.scheduleDays === p.length && (this.scheduleState = "done", window.clearTimeout(this.scheduleTimer));
    }
    this.changed();
  }
}
function ss(o) {
  const t = (e, s) => ({
    pct: e,
    source: s,
    noHeat: e !== null && e > 0 && !o.boilerHeating
  });
  return o.hasSensor ? t(o.sensor, "sensor") : o.state === "off" ? t(0, o.action === void 0 ? "estimated" : "reported") : o.action === "heating" ? t(100, "reported") : o.action === "idle" || o.action === "off" ? t(0, "reported") : o.boilerHeating ? o.current === null || o.target === null ? t(null, "estimated") : t(o.current < o.target ? 100 : 0, "estimated") : t(0, "estimated");
}
function is(o) {
  if (o.pct === null) return "–";
  const t = o.source === "sensor" ? `${o.pct}% open` : o.pct > 0 ? "Open" : "Closed";
  return o.noHeat ? `${t} · boiler off` : t;
}
function Yt(o) {
  if (o.pct === null) return "Valve position unknown";
  const t = o.pct > 0 ? "open" : "closed", e = o.source === "sensor" ? `Valve ${o.pct}% open` : o.source === "reported" ? `Valve ${t} (as the valve reports it; it doesn't say how far)` : `Valve ${t} (worked out from the temperatures; this valve doesn't report its position)`;
  return o.noHeat ? `${e}. The boiler isn't heating, so no heat is reaching this radiator.` : e;
}
var ns = Object.defineProperty, g = (o, t, e, s) => {
  for (var i = void 0, n = o.length - 1, a; n >= 0; n--)
    (a = o[n]) && (i = a(t, e, i) || i);
  return i && ns(t, e, i), i;
};
const wt = {
  minutes: { id: "input_number.heating_panel_boost_minutes", name: "Heating panel boost minutes", min: 5, max: 240, step: 5, unit: "min", icon: "mdi:timer-outline" },
  temperature: { id: "input_number.heating_panel_boost_temperature", name: "Heating panel boost temperature", min: 12, max: 32, step: 0.5, unit: "°C", icon: "mdi:thermometer" },
  away_temperature: { id: "input_number.heating_panel_away_temperature", name: "Heating panel away temperature", min: 5, max: 16, step: 0.5, unit: "°C", icon: "mdi:airplane" }
}, Kt = [15, 30, 45, 60, 90, 120], os = (o) => new Promise((t) => window.setTimeout(t, o)), Xt = 1, Gt = ["manual", "boost", "away", "schedule", "override"], Qt = 7, Zt = 28, vt = "heating-panel:schedule-backup", as = (o) => JSON.parse(JSON.stringify(o)), $t = {
  off: "Off",
  schedule: "Schedule",
  manual: "Manual",
  override: "Until next change",
  boost: "Boost",
  away: "Away",
  unknown: ""
}, x = (o) => typeof o == "number" && Number.isFinite(o) ? o : null, rs = (o) => o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, " "), ls = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, te = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, hs = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.2 1.6 1 2.6 2 3C11 9 11 6 12 3z" fill="currentColor" />
</svg>`, L = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, I = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`, Y = (o) => o < 60 ? `${o} min` : o % 60 ? `${Math.floor(o / 60)} h ${o % 60} min` : `${o / 60} h`, ee = (o) => o instanceof Error ? o.message : String(o?.message ?? o), cs = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 7h9M19 7h1M4 17h3M13 17h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <circle cx="16" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="2" />
  <circle cx="10" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="2" />
</svg>`, se = h`<svg viewBox="0 0 24 24" aria-hidden="true" class="plane">
  <path d="M10.5 21l1.5-1 0-5 8 2.5V15l-8-5V4.5a1.5 1.5 0 0 0-3 0V10l-8 5v2.5L9 15v5l1.5 1z" fill="currentColor" transform="translate(1.5 0)" />
</svg>`, ds = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
  <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <rect x="5.5" y="9.5" width="3" height="5" rx="0.5" fill="currentColor" />
</svg>`, Ot = class Ot extends F {
  constructor() {
    super(...arguments), this.narrow = !1, this.view = { kind: "main" }, this.kiosk = !1, this.scheduleDay = O(/* @__PURE__ */ new Date()), this.tick = 0, this.boostOpen = !1, this.boostMinutes = 15, this.boostTemp = 22, this.awayOpen = !1, this.awayDay = 0, this.awayTime = 18 * 60, this.awayTemp = 14, this.toast = "", this.toastError = !1, this.chosen = {}, this.draft = null, this.editing = null, this.copyDays = null, this.frozen = null, this.queuedTemp = null, this.started = !1, this.onVisibility = () => {
      document.hidden || this.link?.requestState();
    }, this.onKeyDown = (t) => {
      t.key === "Escape" && (this.boostOpen = !1, this.awayOpen = !1, this.editing = null, this.copyDays = null);
    }, this.startBoost = () => {
      const t = this.link;
      if (!t) return;
      const e = this.boostMinutes, s = this.boostTemp;
      this.boostOpen = !1, this.command(() => t.boost(e, s), `Boosting for ${Y(e)}`, "boost", s);
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
      for (const i of e) s[i] = T(t.week[i]);
      this.command(
        () => t.saveSchedule(s, e),
        `Tidied ${e.length === 1 ? S[p.indexOf(e[0])] : `${e.length} days`}; your heating times are unchanged`
      );
    }, this.applyPoint = () => {
      const t = this.editing;
      if (!t) return;
      const e = p[t.day];
      if (T(this.shownWeek[e] ?? []).findIndex((a, r) => a.time === t.time && r !== t.index) >= 0) {
        this.showToast(`There's already a change at ${N(t.time)}. Pick another time.`, !0);
        return;
      }
      const n = { time: t.time, setpoint: t.off ? Xt : t.setpoint };
      this.editDraft((a) => {
        const r = [...a[e] ?? []];
        t.index === null ? r.push(n) : r[t.index] = n, a[e] = r.sort((l, c) => l.time - c.time);
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
      }), this.showToast(`Copied to ${t.length === 1 ? S[t[0]] : `${t.length} days`}. Save to send it.`), this.copyDays = null;
    }, this.saveSchedule = () => {
      const t = this.link, e = this.draft;
      if (!t || !e) return;
      const s = this.dirtyDays;
      try {
        localStorage.getItem(vt) || localStorage.setItem(vt, JSON.stringify({ saved: (/* @__PURE__ */ new Date()).toISOString(), week: t.week }));
      } catch {
      }
      this.command(async () => {
        await t.saveSchedule(e, s), this.draft = null;
      }, `Saved to the receiver (${s.length === 1 ? S[p.indexOf(s[0])] : `${s.length} days`})`);
    }, this.restoreBackup = () => {
      const t = this.backup;
      t && (this.editDraft((e) => {
        for (const s of p) t.week[s] && (e[s] = T(t.week[s]));
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
    t && (this.link = new es(() => this.hass, t, () => this.requestUpdate(), this.rc?.state_entity), this.link.start());
  }
  showToast(t, e = !1) {
    this.toast = t, this.toastError = e, window.clearTimeout(this.toastTimer), this.toastTimer = window.setTimeout(() => this.toast = "", e ? 8e3 : 2500);
  }
  async command(t, e, s, i) {
    if (s) {
      const c = this.liveReceiver;
      this.frozen = { view: i === void 0 ? c : { ...c, target: i, off: !1 }, mode: s };
    }
    let n = !1;
    try {
      await t(), n = !0, this.queuedTemp === null && this.showToast(e);
    } catch (c) {
      this.showToast(ee(c), !0);
    } finally {
      this.frozen = null;
    }
    const a = this.queuedTemp;
    this.queuedTemp = null;
    const r = this.link, l = s ?? this.receiver.mode;
    n && a !== null && r && this.command(
      () => r.setTarget(a),
      `${l === "manual" ? "Manual at" : "Set to"} ${w(a)}`,
      l,
      a
    );
  }
  /** The dial can be used now, including while a change is still being sent (the turn is then queued). */
  dialUsable(t) {
    const e = this.link;
    if (!e || e.status !== "live") return !1;
    const s = this.frozen?.mode ?? t;
    return !Gt.includes(s) || (s === "schedule" || s === "override") && this.rc?.controls?.override === !1 ? !1 : !e.busy || !!this.frozen;
  }
  /**
   * The dial was turned. While a change is still being sent (e.g. Manual being set up, which resets the
   * temperature when the hold starts), show the choice straight away and send it once the receiver is ready.
   */
  onDial(t, e) {
    const s = this.link;
    if (!s) return;
    if (s.busy) {
      this.frozen && Gt.includes(this.frozen.mode) && (this.queuedTemp = t, this.frozen = { ...this.frozen, view: { ...this.frozen.view, target: t, off: !1 } });
      return;
    }
    const i = e === "schedule" || e === "override" ? Ft(s.week, /* @__PURE__ */ new Date()) : null, n = i ? ` until ${this.whenText({ ...i, setpoint: t }).replace(/^at /, "")}` : "";
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
    const s = Number(this.hass?.states[wt[t].id]?.state);
    if (Number.isFinite(s)) return s;
    const i = this.rc?.controls, n = typeof i?.boost == "object" ? i.boost : {};
    return (t === "away_temperature" ? i?.away_temperature : n[t]) ?? { minutes: 15, temperature: 22, away_temperature: 14 }[t];
  }
  get boostConfig() {
    const t = this.rc?.controls?.boost, e = (typeof t == "object" ? t.max_minutes : void 0) ?? 120;
    return { minutes: Math.min(this.setting("minutes"), e), temperature: this.setting("temperature"), max_minutes: e };
  }
  async saveSetting(t, e) {
    const s = wt[t];
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
        for (let i = 0; i < 20 && !this.hass.states[s.id]; i++) await os(250);
        if (!this.hass.states[s.id])
          throw new Error(`the helper was created but ${s.id} didn't appear. Check Settings → Devices & services → Helpers.`);
      }
      await this.hass.callService("input_number", "set_value", { value: e }, { entity_id: s.id }), this.showToast("Saved for everyone");
    } catch (i) {
      const { [t]: n, ...a } = this.chosen;
      this.chosen = a, this.showToast(`Couldn't save: ${ee(i)}`, !0);
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
    return `${e === 0 ? "today" : e === 1 ? "tomorrow" : e < 7 ? ot[O(t)] : t.toLocaleDateString(void 0, { day: "numeric", month: "short" })} at ${N(t.getHours() * 60 + t.getMinutes())}`;
  }
  /** When an Away running now ends, from the receiver's countdown. */
  get awayEnds() {
    const t = this.link?.holdEnds;
    return t == null ? null : new Date(Math.round(t / 6e4) * 6e4);
  }
  openAway() {
    const t = /* @__PURE__ */ new Date();
    this.awayTime = 18 * 60, this.awayDay = this.dayFromToday(t.getHours() * 60 + t.getMinutes() < this.awayTime ? 0 : 1), this.awayTemp = this.setting("away_temperature"), this.awayOpen = !0;
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
      const a = this.radiators.findIndex(
        (r) => [r.name, r.entity, r.entity.split(".")[1]].some((l) => l?.toLowerCase() === i)
      );
      if (a >= 0) {
        this.view = { kind: "radiator", index: a };
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
      const s = t.report, i = t.mode, n = x(t.target);
      return {
        mode: i,
        target: n,
        off: i === "off" || n !== null && A(n),
        current: x(s.local_temperature),
        heating: s.running_state === "heat"
      };
    }
    const e = this.rc?.entity ? this.hass?.states[this.rc.entity] : void 0;
    return {
      mode: "unknown",
      target: x(e?.attributes.temperature),
      off: e?.state === "off",
      current: x(e?.attributes.current_temperature),
      heating: e?.attributes.hvac_action === "heating"
    };
  }
  whenText(t) {
    return `${t.dayOffset === 0 ? "" : t.dayOffset === 1 ? "tomorrow " : `${ot[(O(/* @__PURE__ */ new Date()) + t.dayOffset) % 7]} `}at ${N(t.time)}`;
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
      const s = qe(e.week, /* @__PURE__ */ new Date());
      if (!s) return { text: "", attention: !1 };
      if (t === "override") {
        const n = Ft(e.week, /* @__PURE__ */ new Date());
        return { text: n ? `Back to schedule ${this.whenText({ ...n, setpoint: 0 })}` : "", attention: !1 };
      }
      return { text: `${A(s.setpoint) ? "Off" : w(s.setpoint)} ${this.whenText(s)}`, attention: !1 };
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
        ${this.toast ? h`<div class="toast ${this.toastError ? "error" : ""}" role="status">${this.toast}</div>` : d}
      </div>
    `;
  }
  renderHeader(t) {
    const e = this.view.kind !== "main";
    return this.kiosk && !e ? h`<div class="kiosk-gap"></div>` : h`<header>
      ${e ? h`<button class="round back" title="Back" aria-label="Back" @click=${this.back}>${ls}</button>` : this.narrow ? h`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : d}
      <h1>${t}</h1>
      ${!e && this.isAdmin ? h`<button class="round" title="Settings" aria-label="Settings" @click=${() => this.go({ view: "settings" })}>
            ${cs}
          </button>` : d}
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
      </p>`), e.length ? h`<div class="notices">${e}</div>` : d;
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
    ], a = e.mode === "override" ? "schedule" : e.mode, r = this.link, l = r?.status === "live" && !r.busy, c = this.dialUsable(e.mode), m = e.mode === "away" && !this.frozen ? this.awayEnds : null, u = r?.status === "live" ? r.tpi : null;
    return h`
      <section class="hero">
        <heating-dial
          .min=${t.min_temp ?? 5}
          .max=${t.max_temp ?? 32}
          .target=${e.target}
          .current=${e.current}
          .off=${e.off}
          .active=${e.heating || e.mode === "boost"}
          .label=${u && $t[e.mode] ? `${$t[e.mode]} · TPI` : $t[e.mode]}
          .note=${s.text}
          .attention=${s.attention}
          .readonly=${!c}
          @dial-change=${(v) => this.onDial(v.detail.value, e.mode)}
        ></heating-dial>
        <p class="running ${e.heating && !r?.busy ? "on" : ""}">
          ${r?.busy ? "Sending to the receiver…" : e.heating ? h`${hs} Heating now` : "Not heating"}
        </p>
        ${u && !r?.busy ? this.renderTpi(u) : d}
      </section>

      ${n.length ? h`<div class="modes" style=${`--n: ${n.length}`}>
            ${n.map(
      (v) => h`<button
                class="mode"
                aria-pressed=${String(a === v.mode)}
                title=${v.label}
                ?disabled=${!l}
                @click=${() => this.onMode(v.mode)}
              >
                ${v.label}
              </button>`
    )}
          </div>` : d}

      ${i.away ? h`<button
            class="away-button"
            aria-pressed=${String(e.mode === "away")}
            ?disabled=${!l || e.mode === "boost"}
            @click=${() => this.openAway()}
          >
            ${se}
            ${e.mode === "away" ? m ? `Away until ${this.dateText(m)}` : "Away" : "Going away?"}
          </button>` : d}

      <button class="card" @click=${() => this.go({ view: "schedule" })}>
        <span class="card-head">
          <span>Schedule</span>
          ${te}
        </span>
        ${this.renderBar(O(/* @__PURE__ */ new Date()))} ${this.renderTicks()}
        ${this.renderScheduleStatus()}
      </button>

      ${this.renderRadiators(e.heating)}
    `;
  }
  renderSettings() {
    if (!this.isAdmin) return h`<p class="notice">Only an administrator can change these settings.</p>`;
    const t = this.setting("minutes"), e = this.boostConfig.max_minutes, s = (i, n, a, r) => {
      const l = this.setting(i);
      return h`<div class="stepper">
        <button class="round" title="Lower" aria-label=${`Lower the ${n}`} ?disabled=${l <= a}
          @click=${() => this.saveSetting(i, Math.max(a, l - 0.5))}>${L}</button>
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
        ${Kt.filter((i) => i <= e).map(
      (i) => h`<button class="chip" aria-pressed=${String(i === t)} @click=${() => this.saveSetting("minutes", i)}>
            ${Y(i)}
          </button>`
    )}
      </div>
      <p class="sheet-label">Usual temperature</p>
      ${s("temperature", "usual boost temperature", 12, this.rc?.max_temp ?? 32)}
      ${this.controls.away ? h`<h2>Away</h2>
            <p class="sheet-label">Temperature while away</p>
            ${s("away_temperature", "away temperature", wt.away_temperature.min, ct)}` : d}
    `;
  }
  renderAwaySheet() {
    if (!this.awayOpen) return d;
    const t = this.link, e = !!t?.busy, s = t?.mode === "away", i = this.awayEnds, n = this.awayUntil, a = (n.getTime() - Date.now()) / 6e4, r = a >= 1 && a <= Tt, l = (c) => this.awayTime = (this.awayTime + c + 24 * 60) % (24 * 60);
    return h`<div class="sheet-backdrop" @click=${(c) => c.target === c.currentTarget && (this.awayOpen = !1)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Away">
        <div class="sheet-head">
          <span>${se} Away</span>
          <button class="close" @click=${() => this.awayOpen = !1}>Close</button>
        </div>
        ${s ? h`<p class="sheet-text">
                Away at ${w(t?.report.occupied_heating_setpoint ?? 0)}${i ? ` until ${this.dateText(i)}` : ""}. The
                heating goes back to its schedule then by itself.
              </p>
              <button class="primary" ?disabled=${e} @click=${this.endAway}>We're back: end Away now</button>` : h`<p class="sheet-text">
                Keeps the house at a low temperature while you're away, then goes back to the schedule by itself. Set
                the return a little early to come home to a warm house. Up to 24 hours: for longer, set a holiday on the
                remote (plane icon).
              </p>
              <p class="sheet-label">Back</p>
              <div class="chips two">
                ${[0, 1].map((c) => {
      const m = this.dayFromToday(c);
      return h`<button class="chip" aria-pressed=${String(m === this.awayDay)} @click=${() => this.awayDay = m}>
                    ${c === 0 ? "Today" : "Tomorrow"}
                  </button>`;
    })}
              </div>
              <p class="sheet-label">at</p>
              <div class="stepper time-stepper">
                <button class="round small" title="An hour earlier" aria-label="An hour earlier" @click=${() => l(-60)}>−1h</button>
                <button class="round" title="15 minutes earlier" aria-label="15 minutes earlier" @click=${() => l(-15)}>${L}</button>
                <span class="stepper-value">${N(this.awayTime)}</span>
                <button class="round" title="15 minutes later" aria-label="15 minutes later" @click=${() => l(15)}>${I}</button>
                <button class="round small" title="An hour later" aria-label="An hour later" @click=${() => l(60)}>+1h</button>
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
                ${r ? `Away until ${this.dateText(n)}` : a < 1 ? "Pick a time in the future" : "That's more than 24 hours away"}
              </button>`}
      </div>
    </div>`;
  }
  renderBoostSheet() {
    if (!this.boostOpen) return d;
    const t = this.link, e = !!t?.busy, s = this.boostConfig, i = t?.mode === "boost", n = this.rc?.max_temp ?? 32, a = [.../* @__PURE__ */ new Set([...Kt, s.minutes])].filter((l) => l <= s.max_minutes).sort((l, c) => l - c), r = t?.minutesLeft;
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
                Boosting at ${w(t?.report.occupied_heating_setpoint ?? 0)}${r == null ? "" : r === 0 ? ", less than a minute left" : `, ${Y(r)} left`}.
              </p>
              <button class="primary" ?disabled=${e} @click=${this.stopBoost}>Stop boost</button>` : h`<p class="sheet-label">How long</p>
              <div class="chips">
                ${a.map(
      (l) => h`<button
                    class="chip"
                    aria-pressed=${String(l === this.boostMinutes)}
                    @click=${() => this.boostMinutes = l}
                  >
                    ${Y(l)}
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
                Boost for ${Y(this.boostMinutes)}
              </button>`}
      </div>
    </div>`;
  }
  renderScheduleStatus() {
    const t = this.link?.scheduleState;
    return t === "loading" && !this.link?.scheduleDays ? h`<p class="empty">Reading the schedule from the receiver…</p>` : t === "partial" ? h`<p class="empty">Only ${this.link?.scheduleDays} of 7 days came back from the receiver.</p>` : d;
  }
  renderBar(t, e = this.link?.week ?? {}) {
    const s = je(e, t), i = /* @__PURE__ */ new Date(), n = i.getHours() * 60 + i.getMinutes(), a = t === O(i);
    return h`<span class="bar ${s.length ? "" : "unknown"}">
      ${s.map((r) => {
      const l = r.setpoint === null ? "unknown" : A(r.setpoint) ? "off" : "on", c = l === "on" ? `background: ${kt(r.setpoint)};` : "";
      return h`<span
          class="seg ${l}"
          style=${`left: ${r.start / 14.4}%; width: ${(r.end - r.start) / 14.4}%; ${c}`}
        ></span>`;
    })}
      ${a && s.length ? h`<span class="now" style=${`left: ${n / 14.4}%`}></span>` : d}
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
    const e = as(this.draft ?? this.link?.week ?? {});
    for (const s of p) e[s] && (e[s] = T(e[s]));
    t(e), this.draft = this.dirtyDaysOf(e).length ? e : null;
  }
  /**
   * Days whose filler slots aren't the panel's (the receiver's own, at e.g. 12:00 and 14:00). A temporary
   * change ends at the next slot of any kind, so on these days it can end early.
   */
  get untidyDays() {
    const t = this.link?.week ?? {}, e = (s) => JSON.stringify([...s].sort((i, n) => i.time - n.time));
    return p.filter((s) => t[s] && e(t[s]) !== e(ue(t[s])));
  }
  dirtyDaysOf(t) {
    const e = this.link?.week ?? {};
    return p.filter((s) => !xt(t[s], e[s]));
  }
  openPoint(t, e) {
    if (!this.canEditSchedule) return;
    const s = T(this.shownWeek[p[t]] ?? []), i = e === null ? void 0 : s[e], n = s[s.length - 1], a = i?.time ?? Math.min(23 * 60 + 45, (n?.time ?? 6 * 60) + 60), r = i?.setpoint ?? (n && !A(n.setpoint) ? Xt : 20);
    this.editing = {
      day: t,
      index: e,
      time: a,
      setpoint: A(r) ? 20 : r,
      off: A(r)
    };
  }
  get backup() {
    try {
      const t = localStorage.getItem(vt);
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  renderSchedule() {
    const t = this.shownWeek, e = this.scheduleDay, s = T(t[p[e]] ?? []), i = this.link?.scheduleState, n = this.canEditSchedule, a = this.dirtyDays, r = this.backup;
    return h`
      <section class="schedule ${a.length ? "has-save-bar" : ""}">
        <div class="week">
          ${p.map(
      (l, c) => h`<button
              class="day-row"
              aria-pressed=${String(c === e)}
              aria-label=${`${S[c]}${a.includes(l) ? ", not saved" : ""}`}
              @click=${() => this.scheduleDay = c}
            >
              <span class="day-name">${ot[c]}${a.includes(l) ? h`<span class="dot" title="Not saved"></span>` : d}</span>
              ${this.renderBar(c, t)}
            </button>`
    )}
          <div class="day-row ticks-row"><span></span>${this.renderTicks()}</div>
        </div>

        <h2>${S[e]}</h2>
        ${s.length ? h`<ol class="points">
              ${s.map(
      (l, c) => h`<li>
                  <button class="point" ?disabled=${!n} @click=${() => this.openPoint(e, c)}>
                    <span class="time">${N(l.time)}</span>
                    <span
                      class="swatch ${A(l.setpoint) ? "off" : "on"}"
                      style=${A(l.setpoint) ? "" : `background: ${kt(l.setpoint)}`}
                    ></span>
                    <span>${A(l.setpoint) ? "Off" : w(l.setpoint)}</span>
                    ${n ? te : d}
                  </button>
                </li>`
    )}
            </ol>` : h`<p class="empty">
              ${i === "loading" ? "Reading the schedule from the receiver…" : "No schedule for this day has come back yet."}
            </p>`}
        ${s.length ? h`<div class="point-actions">
              <button class="secondary" ?disabled=${!n || s.length >= Q} @click=${() => this.openPoint(e, null)}>
                Add a change
              </button>
              <button class="secondary" ?disabled=${!n} @click=${() => this.copyDays = []}>Copy to other days</button>
            </div>
            ${s.length >= Q ? h`<p class="empty">The receiver allows ${Q} changes a day.</p>` : d}` : d}
        ${i === "partial" || i !== "loading" && this.link && this.link.scheduleDays < 7 ? h`<button class="retry" @click=${() => this.link?.requestSchedule()}>Read again</button>` : d}
        ${n && !a.length && this.untidyDays.length ? h`<div class="card tidy">
              <p>
                ${this.untidyDays.length === 7 ? "Every day" : `${this.untidyDays.length} days`} still
                ${this.untidyDays.length === 1 || this.untidyDays.length === 7 ? "has" : "have"} the receiver's own filler times, so a temporary change
                can end early (for example at 12:00). Tidying them keeps your heating times exactly the same.
              </p>
              <button class="secondary" @click=${this.tidySchedule}>Tidy the schedule</button>
            </div>` : d}
        ${r && n ? h`<button class="link" @click=${this.restoreBackup}>
              Put back the schedule from before the first change (${new Date(r.saved).toLocaleDateString()})
            </button>` : d}
      </section>

      ${a.length ? h`<div class="save-bar">
            <button class="secondary" ?disabled=${this.link?.busy} @click=${() => this.draft = null}>Discard</button>
            <button class="primary" ?disabled=${!this.link || this.link.busy || this.link.status !== "live"} @click=${this.saveSchedule}>
              ${this.link?.busy ? "Saving…" : `Save ${a.length === 1 ? S[p.indexOf(a[0])] : `${a.length} days`}`}
            </button>
          </div>` : d}
      ${this.renderPointSheet()} ${this.renderCopySheet()}
    `;
  }
  renderPointSheet() {
    const t = this.editing;
    if (!t) return d;
    const e = (n) => this.editing = { ...t, ...n }, s = (n) => e({ time: Math.min(23 * 60 + 45, Math.max(0, t.time + n)) }), i = T(this.shownWeek[p[t.day]] ?? []);
    return h`<div class="sheet-backdrop" @click=${(n) => n.target === n.currentTarget && (this.editing = null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Change">
        <div class="sheet-head">
          <span>${t.index === null ? `New change on ${S[t.day]}` : `${S[t.day]}, ${N(i[t.index]?.time ?? t.time)}`}</span>
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
            ?disabled=${t.off || t.setpoint <= Qt}
            @click=${() => e({ setpoint: Math.max(Qt, t.setpoint - 0.5) })}
          >
            ${L}
          </button>
          <span class="stepper-value">${t.off ? "Off" : w(t.setpoint)}</span>
          <button
            class="round"
            title="Raise"
            aria-label="Raise the temperature"
            ?disabled=${t.off || t.setpoint >= Zt}
            @click=${() => e({ setpoint: Math.min(Zt, t.setpoint + 0.5) })}
          >
            ${I}
          </button>
        </div>
        <button class="primary" @click=${this.applyPoint}>Done</button>
        ${t.index !== null ? h`<button class="link danger" ?disabled=${i.length <= 1} @click=${this.removePoint}>
              ${i.length <= 1 ? "A day needs at least one change" : "Remove this change"}
            </button>` : d}
      </div>
    </div>`;
  }
  renderCopySheet() {
    const t = this.copyDays;
    if (!t) return d;
    const e = this.scheduleDay, s = (n) => this.copyDays = t.includes(n) ? t.filter((a) => a !== n) : [...t, n], i = p.map((n, a) => a).filter((n) => n !== e);
    return h`<div class="sheet-backdrop" @click=${(n) => n.target === n.currentTarget && (this.copyDays = null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Copy to other days">
        <div class="sheet-head">
          <span>Copy ${S[e]} to…</span>
          <button class="close" @click=${() => this.copyDays = null}>Close</button>
        </div>
        <div class="chips">
          ${i.map(
      (n) => h`<button class="chip" aria-pressed=${String(t.includes(n))} @click=${() => s(n)}>
              ${ot[n]}
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
          ${t.length ? `Copy to ${t.length === 1 ? S[t[0]] : `${t.length} days`}` : "Pick the days"}
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
    return ss({
      sensor: this.sensorNumber(t.position),
      hasSensor: !!t.position,
      boilerHeating: this.receiver.heating,
      state: e.state,
      action: typeof e.attributes.hvac_action == "string" ? e.attributes.hvac_action : void 0,
      current: x(e.attributes.current_temperature),
      target: x(e.attributes.temperature)
    });
  }
  renderRadiators(t) {
    const e = this.radiators;
    if (!e.length) return d;
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
    const i = x(e.attributes.current_temperature), n = x(e.attributes.temperature), a = this.valve(t, e), r = this.sensorNumber(t.battery);
    return h`<button class="row" @click=${() => this.go({ radiator: t.entity.split(".")[1] })}>
      <span class="row-name">
        ${s}
        ${r !== null && r < 20 ? h`<span class="battery" title=${`Battery low (${r}%)`} aria-label=${`Battery low, ${r}%`}>${ds}</span>` : d}
      </span>
      <span class="row-temps">
        <span class="row-cur">${i === null ? "–" : w(i)}</span>
        <span class="row-sub">${n === null ? "" : `set ${w(n)}`}</span>
      </span>
      <span class="valve ${a.noHeat ? "no-heat" : ""}" title=${Yt(a)}>
        <span style=${`width: ${a.pct ?? 0}%`}></span>
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
      ${e ? "Heating" : "Resting"} · ${t.demand}%${t.setpoint !== null ? h` · <span class="tpi-remote">remote shows ${w(t.setpoint)}</span>` : d}
    </p>`;
  }
  renderRadiator(t) {
    const e = this.hass.states[t.entity];
    if (!e) return h`<p class="notice">Not found: ${t.entity}. Check the entity id in the panel config.</p>`;
    const s = this.valve(t, e), i = this.sensorNumber(t.battery), n = e.attributes.preset_mode ?? e.state;
    return h`
      <section class="hero">
        <heating-dial
          .min=${x(e.attributes.min_temp) ?? 5}
          .max=${x(e.attributes.max_temp) ?? 30}
          .target=${x(e.attributes.temperature)}
          .current=${x(e.attributes.current_temperature)}
          .off=${e.state === "off"}
          .active=${e.attributes.hvac_action === "heating"}
          .label=${rs(n)}
          @dial-change=${(a) => {
      const r = a.detail.value;
      this.command(
        () => this.hass.callService("climate", "set_temperature", { temperature: r }, { entity_id: t.entity }).then(() => {
        }),
        `${this.radiatorName(t)} set to ${w(r)}`
      );
    }}
        ></heating-dial>
      </section>
      <dl class="facts">
        <div><dt>Valve</dt><dd class=${s.noHeat ? "no-heat" : ""} title=${Yt(s)}>${is(s)}</dd></div>
        <div><dt>Battery</dt><dd class=${i !== null && i < 20 ? "low" : ""}>${i === null ? "–" : `${i}%`}</dd></div>
      </dl>
    `;
  }
};
Ot.styles = ne`
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
    .chips.two {
      grid-template-columns: repeat(2, 1fr);
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
let f = Ot;
g([
  k({ attribute: !1 })
], f.prototype, "hass");
g([
  k({ attribute: !1 })
], f.prototype, "panel");
g([
  k({ type: Boolean })
], f.prototype, "narrow");
g([
  y()
], f.prototype, "view");
g([
  y()
], f.prototype, "kiosk");
g([
  y()
], f.prototype, "scheduleDay");
g([
  y()
], f.prototype, "tick");
g([
  y()
], f.prototype, "boostOpen");
g([
  y()
], f.prototype, "boostMinutes");
g([
  y()
], f.prototype, "boostTemp");
g([
  y()
], f.prototype, "awayOpen");
g([
  y()
], f.prototype, "awayDay");
g([
  y()
], f.prototype, "awayTime");
g([
  y()
], f.prototype, "awayTemp");
g([
  y()
], f.prototype, "toast");
g([
  y()
], f.prototype, "toastError");
g([
  y()
], f.prototype, "chosen");
g([
  y()
], f.prototype, "draft");
g([
  y()
], f.prototype, "editing");
g([
  y()
], f.prototype, "copyDays");
g([
  y()
], f.prototype, "frozen");
customElements.get("heating-panel") || customElements.define("heating-panel", f);
export {
  f as HeatingPanel
};
