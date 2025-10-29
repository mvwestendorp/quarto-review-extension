var kb = Object.defineProperty;
var kd = (n) => {
  throw TypeError(n);
};
var wb = (n, e, t) => e in n ? kb(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var T = (n, e, t) => wb(n, typeof e != "symbol" ? e + "" : e, t), wd = (n, e, t) => e.has(n) || kd("Cannot " + t);
var v = (n, e, t) => (wd(n, e, "read from private field"), t ? t.call(n) : e.get(n)), W = (n, e, t) => e.has(n) ? kd("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), P = (n, e, t, r) => (wd(n, e, "write to private field"), r ? r.call(n, t) : e.set(n, t), t);
class Oc {
  diff(e, t, r = {}) {
    let i;
    typeof r == "function" ? (i = r, r = {}) : "callback" in r && (i = r.callback);
    const o = this.castInput(e, r), s = this.castInput(t, r), l = this.removeEmpty(this.tokenize(o, r)), a = this.removeEmpty(this.tokenize(s, r));
    return this.diffWithOptionsObj(l, a, r, i);
  }
  diffWithOptionsObj(e, t, r, i) {
    var o;
    const s = (C) => {
      if (C = this.postProcess(C, r), i) {
        setTimeout(function() {
          i(C);
        }, 0);
        return;
      } else
        return C;
    }, l = t.length, a = e.length;
    let c = 1, u = l + a;
    r.maxEditLength != null && (u = Math.min(u, r.maxEditLength));
    const d = (o = r.timeout) !== null && o !== void 0 ? o : 1 / 0, h = Date.now() + d, f = [{ oldPos: -1, lastComponent: void 0 }];
    let p = this.extractCommon(f[0], t, e, 0, r);
    if (f[0].oldPos + 1 >= a && p + 1 >= l)
      return s(this.buildValues(f[0].lastComponent, t, e));
    let m = -1 / 0, y = 1 / 0;
    const g = () => {
      for (let C = Math.max(m, -c); C <= Math.min(y, c); C += 2) {
        let x;
        const L = f[C - 1], D = f[C + 1];
        L && (f[C - 1] = void 0);
        let w = !1;
        if (D) {
          const B = D.oldPos - C;
          w = D && 0 <= B && B < l;
        }
        const A = L && L.oldPos + 1 < a;
        if (!w && !A) {
          f[C] = void 0;
          continue;
        }
        if (!A || w && L.oldPos < D.oldPos ? x = this.addToPath(D, !0, !1, 0, r) : x = this.addToPath(L, !1, !0, 1, r), p = this.extractCommon(x, t, e, C, r), x.oldPos + 1 >= a && p + 1 >= l)
          return s(this.buildValues(x.lastComponent, t, e)) || !0;
        f[C] = x, x.oldPos + 1 >= a && (y = Math.min(y, C - 1)), p + 1 >= l && (m = Math.max(m, C + 1));
      }
      c++;
    };
    if (i)
      (function C() {
        setTimeout(function() {
          if (c > u || Date.now() > h)
            return i(void 0);
          g() || C();
        }, 0);
      })();
    else
      for (; c <= u && Date.now() <= h; ) {
        const C = g();
        if (C)
          return C;
      }
  }
  addToPath(e, t, r, i, o) {
    const s = e.lastComponent;
    return s && !o.oneChangePerToken && s.added === t && s.removed === r ? {
      oldPos: e.oldPos + i,
      lastComponent: { count: s.count + 1, added: t, removed: r, previousComponent: s.previousComponent }
    } : {
      oldPos: e.oldPos + i,
      lastComponent: { count: 1, added: t, removed: r, previousComponent: s }
    };
  }
  extractCommon(e, t, r, i, o) {
    const s = t.length, l = r.length;
    let a = e.oldPos, c = a - i, u = 0;
    for (; c + 1 < s && a + 1 < l && this.equals(r[a + 1], t[c + 1], o); )
      c++, a++, u++, o.oneChangePerToken && (e.lastComponent = { count: 1, previousComponent: e.lastComponent, added: !1, removed: !1 });
    return u && !o.oneChangePerToken && (e.lastComponent = { count: u, previousComponent: e.lastComponent, added: !1, removed: !1 }), e.oldPos = a, c;
  }
  equals(e, t, r) {
    return r.comparator ? r.comparator(e, t) : e === t || !!r.ignoreCase && e.toLowerCase() === t.toLowerCase();
  }
  removeEmpty(e) {
    const t = [];
    for (let r = 0; r < e.length; r++)
      e[r] && t.push(e[r]);
    return t;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(e, t) {
    return e;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(e, t) {
    return Array.from(e);
  }
  join(e) {
    return e.join("");
  }
  postProcess(e, t) {
    return e;
  }
  get useLongestToken() {
    return !1;
  }
  buildValues(e, t, r) {
    const i = [];
    let o;
    for (; e; )
      i.push(e), o = e.previousComponent, delete e.previousComponent, e = o;
    i.reverse();
    const s = i.length;
    let l = 0, a = 0, c = 0;
    for (; l < s; l++) {
      const u = i[l];
      if (u.removed)
        u.value = this.join(r.slice(c, c + u.count)), c += u.count;
      else {
        if (!u.added && this.useLongestToken) {
          let d = t.slice(a, a + u.count);
          d = d.map(function(h, f) {
            const p = r[c + f];
            return p.length > h.length ? p : h;
          }), u.value = this.join(d);
        } else
          u.value = this.join(t.slice(a, a + u.count));
        a += u.count, u.added || (c += u.count);
      }
    }
    return i;
  }
}
const Cd = "a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
class Cb extends Oc {
  tokenize(e) {
    const t = new RegExp(`(\\r?\\n)|[${Cd}]+|[^\\S\\n\\r]+|[^${Cd}]`, "ug");
    return e.match(t) || [];
  }
}
const Sb = new Cb();
function el(n, e, t) {
  return Sb.diff(n, e, t);
}
class xb extends Oc {
  constructor() {
    super(...arguments), this.tokenize = Mb;
  }
  equals(e, t, r) {
    return r.ignoreWhitespace ? ((!r.newlineIsToken || !e.includes(`
`)) && (e = e.trim()), (!r.newlineIsToken || !t.includes(`
`)) && (t = t.trim())) : r.ignoreNewlineAtEof && !r.newlineIsToken && (e.endsWith(`
`) && (e = e.slice(0, -1)), t.endsWith(`
`) && (t = t.slice(0, -1))), super.equals(e, t, r);
  }
}
const vb = new xb();
function Eb(n, e, t) {
  return vb.diff(n, e, t);
}
function Mb(n, e) {
  e.stripTrailingCr && (n = n.replace(/\r\n/g, `
`));
  const t = [], r = n.split(/(\n|\r\n)/);
  r[r.length - 1] || r.pop();
  for (let i = 0; i < r.length; i++) {
    const o = r[i];
    i % 2 && !e.newlineIsToken ? t[t.length - 1] += o : t.push(o);
  }
  return t;
}
class Tb extends Oc {
  tokenize(e) {
    return e.slice();
  }
  join(e) {
    return e;
  }
  removeEmpty(e) {
    return e;
  }
}
const Nb = new Tb();
function Ib(n, e, t) {
  return Nb.diff(n, e, t);
}
function Sd(n, e) {
  const t = [], r = Eb(n, e);
  let i = 0;
  for (let o = 0; o < r.length; o++) {
    const s = r[o];
    if (!s)
      continue;
    const l = s.value ?? "";
    if (s.added) {
      t.push({
        type: "addition",
        position: i,
        length: l.length,
        text: l
      });
      continue;
    }
    if (s.removed) {
      const a = r[o + 1];
      if (a && a.added) {
        const c = a.value ?? "", u = el(l, c);
        let d = i;
        u.forEach((h) => {
          h.added ? t.push({
            type: "addition",
            position: d,
            length: h.value.length,
            text: h.value
          }) : (h.removed && t.push({
            type: "deletion",
            position: d,
            length: h.value.length,
            text: h.value
          }), d += h.value.length);
        }), i += l.length, o++;
        continue;
      }
      t.push({
        type: "deletion",
        position: i,
        length: l.length,
        text: l
      }), i += l.length;
      continue;
    }
    i += l.length;
  }
  return t;
}
function Ab(n, e) {
  if (e.length === 0)
    return n;
  const t = qb(n, e), r = Md(n), i = Md(t), o = Ib(r, i), s = [];
  for (let l = 0; l < o.length; l++) {
    const a = o[l];
    if (!a)
      continue;
    const c = Array.isArray(a.value) ? a.value : [];
    if (a.added) {
      c.forEach((u) => {
        s.push(Ar(u, "addition"));
      });
      continue;
    }
    if (a.removed) {
      const u = o[l + 1];
      if (u && u.added) {
        const d = Array.isArray(u.value) ? u.value : [];
        s.push(
          ...Ob(
            c,
            d
          )
        ), l++;
      } else
        c.forEach((d) => {
          s.push(Ar(d, "deletion"));
        });
      continue;
    }
    s.push(...c);
  }
  return s.join("");
}
function Ar(n, e) {
  return n.trim().length === 0 ? e === "addition" ? n : "" : Is(n).map((t) => Yi(t, e)).join("");
}
function Ob(n, e) {
  const t = [], r = n.length, i = e.length, o = n.map((u) => ({
    block: u,
    normalized: As(u),
    signature: Td(u)
  })), s = e.map((u) => ({
    block: u,
    normalized: As(u),
    signature: Td(u)
  })), l = Array.from(
    { length: r + 1 },
    () => Array(i + 1).fill(0)
  );
  for (let u = r - 1; u >= 0; u--) {
    const d = l[u] ?? (l[u] = Array(i + 1).fill(0)), h = l[u + 1] ?? [];
    for (let f = i - 1; f >= 0; f--) {
      const p = o[u], m = s[f], y = h[f + 1] ?? 0, g = h[f] ?? 0, C = d[f + 1] ?? 0;
      p && m && p.normalized === m.normalized && p.signature === m.signature ? d[f] = 1 + y : d[f] = Math.max(g, C);
    }
  }
  let a = 0, c = 0;
  for (; a < r && c < i; ) {
    const u = o[a], d = s[c];
    if (!u || !d)
      break;
    if (u.normalized === d.normalized && u.signature === d.signature) {
      t.push(d.block), a++, c++;
      continue;
    }
    const h = l[a + 1]?.[c] ?? 0, f = l[a]?.[c + 1] ?? 0;
    h === f ? (t.push(Rb(u.block, d.block)), a++, c++) : h > f ? (t.push(Ar(u.block, "deletion")), a++) : (t.push(Ar(d.block, "addition")), c++);
  }
  for (; a < r; ) {
    const u = o[a];
    u && t.push(Ar(u.block, "deletion")), a++;
  }
  for (; c < i; ) {
    const u = s[c];
    u && t.push(Ar(u.block, "addition")), c++;
  }
  return t;
}
function Rb(n, e) {
  const t = Is(n), r = Is(e), i = Math.max(t.length, r.length), o = [];
  for (let s = 0; s < i; s++) {
    const l = t[s], a = r[s];
    l !== void 0 && a !== void 0 ? Os(l) && Os(a) && vd(xd(l)) === vd(xd(a)) ? o.push(Lb(l, a)) : La(l) && La(a) ? o.push(Pb(l, a)) : o.push(Db(l, a)) : l !== void 0 ? o.push(Yi(l, "deletion")) : a !== void 0 && o.push(Yi(a, "addition"));
  }
  return o.join("");
}
function Db(n, e) {
  const { content: t, newline: r } = Tn(n), { content: i, newline: o } = Tn(e), { prefix: s, body: l } = xn(t), { prefix: a, body: c } = xn(i);
  if (s !== a)
    return Yi(n, "deletion") + Yi(e, "addition");
  const u = el(l, c);
  let d = s;
  return u.forEach((h) => {
    h.added ? h.value.startsWith(" ") && h.value.length > 1 ? d += " " + je(h.value.slice(1), "addition") : d += je(h.value, "addition") : h.removed ? d += je(h.value, "deletion") : d += h.value;
  }), `${d}${o || r}`;
}
function Lb(n, e) {
  const { content: t, newline: r } = Tn(n), { content: i, newline: o } = Tn(e), s = xn(i).prefix, l = xn(t).body, a = xn(i).body;
  if (As(t) === As(i))
    return `${i}${o || r}`;
  const c = s, u = o || r, d = el(l, a), h = d.some((g) => g.added), f = d.some((g) => g.removed), p = d.some(
    (g) => !g.added && !g.removed && g.value.trim().length > 0
  );
  if (h && f && !p)
    return `${c}${Bb(l, a)}${u}`;
  let m = "";
  d.forEach((g) => {
    g.added ? g.value.startsWith(" ") && g.value.length > 1 ? m += " " + je(g.value.slice(1), "addition") : m += je(g.value, "addition") : g.removed ? m += je(g.value, "deletion") : m += g.value;
  });
  const y = `${c}${m}`;
  return y.trim() === c.trim() ? `${c}${je(a, "addition")}${u}` : `${y}${u}`;
}
function Pb(n, e) {
  const { content: t, newline: r } = Tn(n), { content: i } = Tn(e);
  if (Ed(t) && Ed(i))
    return `${i}${r || ""}`;
  const o = t.split("|"), s = i.split("|"), l = Math.max(o.length, s.length), a = [];
  for (let c = 0; c < l; c++) {
    const u = o[c] ?? "", d = s[c] ?? "";
    if (c === 0 || c === l - 1) {
      a.push(d || u);
      continue;
    }
    a.push($b(u, d));
  }
  return `${a.join("|")}${r || ""}`;
}
function Yi(n, e) {
  const { content: t, newline: r } = Tn(n);
  if (!t.trim())
    return e === "addition" ? t + r : r;
  const { prefix: i, body: o } = xn(t);
  if (i) {
    if (o.trim().length === 0) {
      const s = `${i}${o}`;
      return `${je(s, e)}${r}`;
    }
    return `${i}${je(o, e)}${r}`;
  }
  return La(t) ? zb("", t, e) + r : `${je(t, e)}${r}`;
}
function je(n, e) {
  if (!n) return "";
  const t = n;
  return t.trim() ? e === "addition" ? `{++${t}++}` : `{--${t}--}` : t;
}
function Bb(n, e) {
  const t = n.trim(), r = e.trim();
  if (!t && !r)
    return e;
  const i = e.match(/^\s*/)?.[0] ?? "", o = e.match(/\s*$/)?.[0] ?? "";
  return `${i}{~~${t}~>${r}~~}${o}`;
}
function $b(n, e) {
  const t = n.trim(), r = e.trim();
  if (t === r)
    return e || n;
  const i = e.match(/^\s*/), o = e.match(/\s*$/), s = i?.[0] ?? "", l = o?.[0] ?? "", a = el(t, r);
  let c = "";
  return a.forEach((u) => {
    const d = u.value ?? "";
    u.added ? c += je(d, "addition") : u.removed ? c += je(d, "deletion") : c += d;
  }), `${s}${c}${l}`;
}
function Tn(n) {
  return n.endsWith(`
`) ? { content: n.slice(0, -1), newline: `
` } : { content: n, newline: "" };
}
function xn(n) {
  const e = n.match(/^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/);
  if (e) {
    const [, t = "", r = ""] = e;
    return { prefix: t, body: r };
  }
  return { prefix: "", body: n };
}
function Is(n) {
  return n === "" ? [] : n.match(/[^\n]*\n?/g)?.filter((e) => e.length > 0) ?? [];
}
function xd(n) {
  const { content: e } = Tn(n);
  return e.match(/^(\s*(?:[-*+]|\d+[.)])\s+)/)?.[0] ?? null;
}
function vd(n) {
  return n ? n.replace(/^(\s*)([-*+]|\d+[.)])\s+/, "$1$2 ") : null;
}
function La(n) {
  const e = n.trim();
  return e.includes("|") ? (e.match(/\|/g) || []).length >= 2 : !1;
}
function Ed(n) {
  const e = n.trim();
  if (!e.includes("|")) return !1;
  const t = e.split("|").filter((r) => r.length > 0);
  return t.length > 0 && t.every((r) => /^:?-+:?$/.test(r.trim()));
}
function zb(n, e, t) {
  const r = e.split("|");
  if (r.length < 2)
    return `${n}${je(e, t)}`;
  const i = r.map((o, s) => {
    if (s === 0 || s === r.length - 1)
      return o;
    const l = o.trim();
    if (!l || /^:?-+:?$/.test(l))
      return o;
    const a = o.match(/^\s*/), c = o.match(/\s*$/), u = a?.[0] ?? "", d = c?.[0] ?? "", h = o.slice(
      u.length,
      o.length - d.length
    );
    return `${u}${je(h || " ", t)}${d}`;
  }).join("|");
  return `${n}${i}`;
}
function Md(n) {
  const e = Is(n), t = [];
  let r = 0;
  for (; r < e.length; ) {
    const i = e[r];
    if (!i)
      break;
    if (Os(i)) {
      const o = Pa(i);
      let s = i;
      for (r++; r < e.length; ) {
        const l = e[r];
        if (!l)
          break;
        if (l.trim() === "") {
          s += l, r++;
          break;
        }
        if (Os(l) && Pa(l) <= o)
          break;
        if (Fb(l, o)) {
          s += l, r++;
          continue;
        }
        break;
      }
      t.push(s);
    } else
      t.push(i), r++;
  }
  return t;
}
function As(n) {
  return _b(n);
}
function Td(n) {
  return n.replace(/[ \t]+$/gm, "").trimEnd().split(/\r?\n/).map((r) => {
    const { prefix: i } = xn(r);
    if (!i)
      return "paragraph";
    const s = (i.match(/^\s*/)?.[0] ?? "").length, a = i.trim().replace(/\d+/g, "#").match(/^([-*+]|#(?:[.)]?))/)?.[0] ?? i.trim();
    return `${s}:${a}`;
  }).join("|");
}
function Os(n) {
  return /^(\s*)([-*+]|\d+[.)])\s/.test(n);
}
function Pa(n) {
  return n.match(/^(\s*)/)?.[1]?.length ?? 0;
}
function Fb(n, e) {
  return n.trim() ? Pa(n) > e : !0;
}
function _b(n) {
  return n.split(/\r?\n/).map((r) => {
    if (!r.trim())
      return "";
    const { prefix: i, body: o } = xn(r), s = Hb(o);
    if (!i)
      return s.trim();
    const l = i.replace(/\s+/g, " ").trimEnd(), a = s.trim();
    return a.length > 0 ? `${l} ${a}` : l;
  }).filter((r) => r.length > 0).join(`
`);
}
function Hb(n) {
  return n.replace(/\{~~([^~]*?)~>([^]*?)~~\}/g, "$2").replace(/\{--([^]*?)--\}/g, "").replace(/\{\+\+([^]*?)\+\+\}/g, "$1").replace(/\{==([^]*?)==\}/g, "$1").replace(/\{>>([^]*?)<<\}/g, "").trim();
}
function qb(n, e) {
  if (e.length === 0)
    return n;
  const t = [...e].sort((i, o) => o.position - i.position);
  let r = n;
  for (const i of t)
    if (i.type === "addition") {
      const o = r.substring(0, i.position), s = r.substring(i.position);
      r = o + i.text + s;
    } else if (i.type === "deletion") {
      const o = r.substring(0, i.position), s = r.substring(i.position + i.length);
      r = o + s;
    }
  return r;
}
function jb(n, e = !0) {
  let t = n;
  return e ? (t = t.replace(/\{--[^}]*--\}/g, ""), t = t.replace(/\{\+\+([^}]*)\+\+\}/g, "$1"), t = t.replace(/\{~~[^~]*~>([^}]*)~~\}/g, "$1")) : (t = t.replace(/\{--([^}]*)--\}/g, "$1"), t = t.replace(/\{\+\+[^}]*\+\+\}/g, ""), t = t.replace(/\{~~([^~]*)~>[^}]*~~\}/g, "$1")), t = t.replace(/\{>>[^}]*<<\}/g, ""), t = t.replace(/\{==([^}]*)==\}/g, "$1"), t;
}
class Vb {
  constructor() {
    T(this, "originalElements", []);
    T(this, "operations", []);
    T(this, "redoStack", []);
    T(this, "saved", !0);
  }
  /**
   * Initialize from DOM - parse HTML to extract original elements
   */
  initializeFromDOM() {
    const e = document.querySelectorAll("[data-review-id]");
    this.originalElements = Array.from(e).map((t) => {
      const r = t.getAttribute("data-review-id") || "", i = t.getAttribute("data-review-type") || "Para", o = t.getAttribute("data-review-level"), s = t.getAttribute("data-review-source-line"), l = t.getAttribute("data-review-source-column"), a = {
        type: i,
        level: o ? parseInt(o, 10) : void 0,
        attributes: this.extractAttributes(t),
        classes: this.extractClasses(t)
      }, c = this.extractMarkdownContent(t), u = {
        id: r,
        content: c,
        metadata: a
      };
      return s && (u.sourcePosition = {
        line: parseInt(s, 10),
        column: l ? parseInt(l, 10) : 0
      }), u;
    });
  }
  /**
   * Extract markdown content from HTML element
   *
   * This function ONLY reads from the embedded data-review-markdown attribute.
   * It does NOT parse or convert HTML to markdown.
   *
   * If the attribute is missing, it throws an error (document not rendered with extension).
   */
  extractMarkdownContent(e) {
    const t = e.getAttribute("data-review-markdown");
    if (!t) {
      const i = e.getAttribute("data-review-id") || "unknown";
      throw new Error(
        `Missing data-review-markdown attribute on element ${i}. The document was not rendered with the Quarto review extension. Please render with: quarto render --filter review`
      );
    }
    const r = this.unescapeHtml(t);
    return this.removeNestedReviewWrappers(r);
  }
  /**
   * Unescape HTML entities
   */
  unescapeHtml(e) {
    const t = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'"
    };
    return e.replace(
      /&amp;|&lt;|&gt;|&quot;|&#39;/g,
      (r) => t[r] ?? r
    );
  }
  /**
   * Extract attributes from element
   */
  extractAttributes(e) {
    const t = {}, r = e.querySelector(":scope > *:not([data-review-id])");
    return r && Array.from(r.attributes).forEach((i) => {
      i.name.startsWith("data-review-") || (t[i.name] = i.value);
    }), t;
  }
  /**
   * Extract classes from element
   */
  extractClasses(e) {
    const t = e.querySelector(":scope > *:not([data-review-id])");
    return t ? Array.from(t.classList).filter(
      (r) => !r.startsWith("review-")
    ) : [];
  }
  /**
   * Add an operation
   */
  addOperation(e, t, r, i) {
    const o = {
      id: this.generateOperationId(),
      type: e,
      elementId: t,
      timestamp: Date.now(),
      userId: i,
      data: r
    };
    this.operations.push(o), this.redoStack = [], this.saved = !1;
  }
  /**
   * Insert a new element
   */
  insert(e, t, r, i, o) {
    const s = `temp-${this.generateOperationId()}`, l = {
      type: "insert",
      content: e,
      metadata: t,
      position: r,
      parentId: o?.parentId,
      generated: o?.generated
    };
    return this.addOperation("insert", s, l, i), s;
  }
  replaceElementWithSegments(e, t) {
    const r = this.findElement(e);
    if (!r)
      throw new Error(`Element ${e} not found`);
    const i = t.length > 0 ? t : [
      {
        content: "",
        metadata: r.metadata
      }
    ], o = this.getGeneratedSegmentIds(e), s = [], l = [], [a, ...c] = i;
    if (!a)
      return { elementIds: s, removedIds: l };
    this.edit(e, a.content, void 0, a.metadata), s.push(e);
    let u = e;
    const d = Math.min(c.length, o.length);
    for (let h = 0; h < d; h++) {
      const f = c[h];
      if (!f)
        continue;
      const p = o[h];
      p && (this.edit(p, f.content, void 0, f.metadata), s.push(p), u = p);
    }
    for (let h = d; h < c.length; h++) {
      const f = c[h];
      if (!f)
        continue;
      const p = this.insert(
        f.content,
        f.metadata,
        { after: u },
        void 0,
        { parentId: e, generated: !0 }
      );
      s.push(p), u = p;
    }
    for (let h = d; h < o.length; h++) {
      const f = o[h];
      f && (this.delete(f), l.push(f));
    }
    return { elementIds: s, removedIds: l };
  }
  /**
   * Delete an element
   */
  delete(e, t) {
    const r = this.findElement(e);
    if (!r)
      throw new Error(`Element ${e} not found`);
    const i = {
      type: "delete",
      originalContent: r.content,
      originalMetadata: r.metadata
    };
    this.addOperation("delete", e, i, t);
  }
  /**
   * Edit an element
   */
  edit(e, t, r, i) {
    const o = this.findElement(e);
    if (!o)
      throw new Error(`Element ${e} not found`);
    const s = o.content, l = i && (i.type !== o.metadata.type || i.level !== o.metadata.level || JSON.stringify(i.attributes ?? {}) !== JSON.stringify(o.metadata.attributes ?? {}) || JSON.stringify(i.classes ?? []) !== JSON.stringify(o.metadata.classes ?? []));
    if (!l && s === t) return;
    const a = Sd(s, t), c = {
      type: "edit",
      oldContent: s,
      newContent: t,
      changes: a
    };
    l && (c.oldMetadata = o.metadata, c.newMetadata = i), this.addOperation("edit", e, c, r);
  }
  /**
   * Move an element
   */
  move(e, t, r, i) {
    const o = {
      type: "move",
      fromPosition: t,
      toPosition: r
    };
    this.addOperation("move", e, o, i);
  }
  /**
   * Undo last operation
   */
  undo() {
    const e = this.operations.pop();
    return e ? (this.redoStack.push(e), this.saved = !1, !0) : !1;
  }
  canUndo() {
    return this.operations.length > 0;
  }
  /**
   * Redo last undone operation
   */
  redo() {
    const e = this.redoStack.pop();
    return e ? (this.operations.push(e), this.saved = !1, !0) : !1;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  /**
   * Get current state by applying operations to original elements
   */
  getCurrentState() {
    let e = [...this.originalElements];
    for (const t of this.operations)
      e = this.applyOperation(e, t);
    return e;
  }
  /**
   * Get element by ID from current state
   * Returns the element with all operations applied
   */
  getElementById(e) {
    return this.findElement(e) || null;
  }
  /**
   * Get element content by ID from current state
   * Returns the markdown content with all operations applied
   */
  getElementContent(e) {
    const t = this.getElementById(e);
    if (!t)
      throw new Error(`Element ${e} not found`);
    return t.content;
  }
  /**
   * Get element content with tracked changes as CriticMarkup
   * Shows edits as {++additions++} and {--deletions--}
   */
  getElementContentWithTrackedChanges(e) {
    const t = this.getElementById(e);
    if (!t)
      throw new Error(`Element ${e} not found`);
    const r = this.getElementBaseline(e), i = t.content;
    if (this.operations.filter(
      (l) => l.elementId === e
    ).length === 0 && r === i)
      return i;
    const s = Sd(r, i);
    return s.length === 0 ? i : Ab(r, s);
  }
  /**
   * Apply a single operation to element array
   */
  applyOperation(e, t) {
    switch (t.type) {
      case "insert":
        return this.applyInsert(e, t);
      case "delete":
        return this.applyDelete(e, t);
      case "edit":
        return this.applyEdit(e, t);
      case "move":
        return this.applyMove(e, t);
      default:
        return e;
    }
  }
  /**
   * Apply insert operation
   */
  applyInsert(e, t) {
    const r = t.data, i = {
      id: t.elementId,
      content: r.content,
      metadata: r.metadata
    };
    if (r.position.after) {
      const o = e.findIndex((s) => s.id === r.position.after);
      o !== -1 && e.splice(o + 1, 0, i);
    } else if (r.position.before) {
      const o = e.findIndex((s) => s.id === r.position.before);
      o !== -1 && e.splice(o, 0, i);
    } else
      e.push(i);
    return e;
  }
  getGeneratedSegmentIds(e) {
    if (!e)
      return [];
    const t = /* @__PURE__ */ new Set();
    for (const s of this.operations)
      s.type === "insert" ? s.data.parentId === e && t.add(s.elementId) : s.type === "delete" && t.has(s.elementId) && t.delete(s.elementId);
    if (t.size === 0)
      return [];
    const r = this.getCurrentState(), i = r.findIndex((s) => s.id === e);
    if (i === -1)
      return [];
    const o = [];
    for (let s = i + 1; s < r.length; s++) {
      const l = r[s];
      if (!l)
        break;
      const a = l.id;
      if (!t.has(a))
        break;
      o.push(a);
    }
    return o;
  }
  /**
   * Apply delete operation
   */
  applyDelete(e, t) {
    return e.filter((r) => r.id !== t.elementId);
  }
  /**
   * Apply edit operation
   */
  applyEdit(e, t) {
    const r = t.data;
    return e.map((i) => {
      if (i.id === t.elementId) {
        const o = { ...i, content: r.newContent };
        return r.newMetadata && (o.metadata = r.newMetadata), o;
      }
      return i;
    });
  }
  /**
   * Apply move operation
   */
  applyMove(e, t) {
    const r = t.data, i = e[r.fromPosition];
    return i && (e.splice(r.fromPosition, 1), e.splice(r.toPosition, 0, i)), e;
  }
  /**
   * Convert current state to markdown
   *
   * This function reconstructs the full document markdown by:
   * 1. Getting current state (original elements + applied operations)
   * 2. Using the embedded markdown from each element (stored in e.content)
   * 3. Joining elements with blank lines
   *
   * NO HTML parsing or conversion happens here - all content is already markdown.
   * The markdown comes from:
   * - Original: data-review-markdown attributes (set by Lua filter)
   * - Edits: User-provided markdown strings
   *
   * NOTE: This may include CriticMarkup annotations from comments/highlights.
   * Use toCleanMarkdown() for Git exports to strip CriticMarkup.
   */
  toMarkdown() {
    return this.getCurrentState().map((t) => t.content).join(`

`);
  }
  /**
   * Convert current state to clean markdown suitable for Git commits
   * Strips all CriticMarkup annotations (comments, highlights, etc.)
   * and applies tracked changes in accept mode.
   */
  toCleanMarkdown() {
    return this.getCurrentState().map((t) => jb(t.content, !0)).join(`

`);
  }
  /**
   * Remove nested review-editable wrappers (Pandoc div fences) that appear inside lists.
   * These wrappers are only present to keep Lua filter metadata and should not surface in the editor.
   */
  removeNestedReviewWrappers(e) {
    if (!e.includes(":::"))
      return e;
    const t = /((?:\r?\n)?)([ \t]*):::\s*\{[^}]*review-editable[^}]*\}[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?[ \t]*:::[^\S\r\n]*(?:\r?\n)?/g;
    let r = e, i;
    do
      i = r, r = r.replace(t, (o, s, l, a) => {
        const c = a.split(/\r?\n/);
        let u = Number.POSITIVE_INFINITY;
        for (const h of c) {
          const f = h.match(/^([ \t]*)(\S)/);
          f && (u = Math.min(u, f[1].length));
        }
        Number.isFinite(u) || (u = 0);
        const d = c.map((h) => {
          if (!h.trim())
            return "";
          const f = h.slice(u);
          return `${l}${f}`;
        }).join(`
`);
        return `${s}${d}`;
      });
    while (r !== i);
    return r;
  }
  /**
   * Get summary of operations
   */
  summarizeOperations() {
    const e = {};
    for (const r of this.operations)
      e[r.type] = (e[r.type] || 0) + 1;
    const t = [];
    return e.insert && t.push(`Added ${e.insert} element(s)`), e.delete && t.push(`Deleted ${e.delete} element(s)`), e.edit && t.push(`Edited ${e.edit} element(s)`), e.move && t.push(`Moved ${e.move} element(s)`), t.length > 0 ? t.join(", ") : "No changes";
  }
  /**
   * Find element by ID in current or original state
   */
  findElement(e) {
    return this.getCurrentState().find((r) => r.id === e);
  }
  getElementBaseline(e) {
    const t = this.findOriginalElement(e);
    if (t) return t.content;
    const r = this.operations.find(
      (i) => i.type === "insert" && i.elementId === e
    );
    return r ? r.data.content : "";
  }
  findOriginalElement(e) {
    return this.originalElements.find((t) => t.id === e);
  }
  /**
   * Generate unique operation ID
   */
  generateOperationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Check if there are unsaved operations
   */
  hasUnsavedOperations() {
    return !this.saved && this.operations.length > 0;
  }
  /**
   * Mark as saved
   */
  markAsSaved() {
    this.saved = !0;
  }
  /**
   * Get operation history
   */
  getOperations() {
    return this.operations;
  }
  /**
   * Clear all operations
   */
  clear() {
    this.operations = [], this.redoStack = [], this.saved = !0;
  }
}
const Ub = {};
function tl(n, e) {
  const t = Ub, r = typeof t.includeImageAlt == "boolean" ? t.includeImageAlt : !0, i = typeof t.includeHtml == "boolean" ? t.includeHtml : !0;
  return Xf(n, r, i);
}
function Xf(n, e, t) {
  if (Wb(n)) {
    if ("value" in n)
      return n.type === "html" && !t ? "" : n.value;
    if (e && "alt" in n && n.alt)
      return n.alt;
    if ("children" in n)
      return Nd(n.children, e, t);
  }
  return Array.isArray(n) ? Nd(n, e, t) : "";
}
function Nd(n, e, t) {
  const r = [];
  let i = -1;
  for (; ++i < n.length; )
    r[i] = Xf(n[i], e, t);
  return r.join("");
}
function Wb(n) {
  return !!(n && typeof n == "object");
}
function Id(n) {
  if (n)
    throw n;
}
function Kb(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
var Dl, Ad;
function Jb() {
  if (Ad) return Dl;
  Ad = 1;
  var n = Object.prototype.hasOwnProperty, e = Object.prototype.toString, t = Object.defineProperty, r = Object.getOwnPropertyDescriptor, i = function(c) {
    return typeof Array.isArray == "function" ? Array.isArray(c) : e.call(c) === "[object Array]";
  }, o = function(c) {
    if (!c || e.call(c) !== "[object Object]")
      return !1;
    var u = n.call(c, "constructor"), d = c.constructor && c.constructor.prototype && n.call(c.constructor.prototype, "isPrototypeOf");
    if (c.constructor && !u && !d)
      return !1;
    var h;
    for (h in c)
      ;
    return typeof h > "u" || n.call(c, h);
  }, s = function(c, u) {
    t && u.name === "__proto__" ? t(c, u.name, {
      enumerable: !0,
      configurable: !0,
      value: u.newValue,
      writable: !0
    }) : c[u.name] = u.newValue;
  }, l = function(c, u) {
    if (u === "__proto__")
      if (n.call(c, u)) {
        if (r)
          return r(c, u).value;
      } else return;
    return c[u];
  };
  return Dl = function a() {
    var c, u, d, h, f, p, m = arguments[0], y = 1, g = arguments.length, C = !1;
    for (typeof m == "boolean" && (C = m, m = arguments[1] || {}, y = 2), (m == null || typeof m != "object" && typeof m != "function") && (m = {}); y < g; ++y)
      if (c = arguments[y], c != null)
        for (u in c)
          d = l(m, u), h = l(c, u), m !== h && (C && h && (o(h) || (f = i(h))) ? (f ? (f = !1, p = d && i(d) ? d : []) : p = d && o(d) ? d : {}, s(m, { name: u, newValue: a(C, p, h) })) : typeof h < "u" && s(m, { name: u, newValue: h }));
    return m;
  }, Dl;
}
var Gb = Jb();
const Ll = /* @__PURE__ */ Kb(Gb);
function Ba(n) {
  if (typeof n != "object" || n === null)
    return !1;
  const e = Object.getPrototypeOf(n);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(Symbol.toStringTag in n) && !(Symbol.iterator in n);
}
function Yb() {
  const n = [], e = { run: t, use: r };
  return e;
  function t(...i) {
    let o = -1;
    const s = i.pop();
    if (typeof s != "function")
      throw new TypeError("Expected function as last argument, not " + s);
    l(null, ...i);
    function l(a, ...c) {
      const u = n[++o];
      let d = -1;
      if (a) {
        s(a);
        return;
      }
      for (; ++d < i.length; )
        (c[d] === null || c[d] === void 0) && (c[d] = i[d]);
      i = c, u ? Xb(u, l)(...c) : s(null, ...c);
    }
  }
  function r(i) {
    if (typeof i != "function")
      throw new TypeError(
        "Expected `middelware` to be a function, not " + i
      );
    return n.push(i), e;
  }
}
function Xb(n, e) {
  let t;
  return r;
  function r(...s) {
    const l = n.length > s.length;
    let a;
    l && s.push(i);
    try {
      a = n.apply(this, s);
    } catch (c) {
      const u = (
        /** @type {Error} */
        c
      );
      if (l && t)
        throw u;
      return i(u);
    }
    l || (a && a.then && typeof a.then == "function" ? a.then(o, i) : a instanceof Error ? i(a) : o(a));
  }
  function i(s, ...l) {
    t || (t = !0, e(s, ...l));
  }
  function o(s) {
    i(null, s);
  }
}
function Bi(n) {
  return !n || typeof n != "object" ? "" : "position" in n || "type" in n ? Od(n.position) : "start" in n || "end" in n ? Od(n) : "line" in n || "column" in n ? $a(n) : "";
}
function $a(n) {
  return Rd(n && n.line) + ":" + Rd(n && n.column);
}
function Od(n) {
  return $a(n && n.start) + "-" + $a(n && n.end);
}
function Rd(n) {
  return n && typeof n == "number" ? n : 1;
}
class We extends Error {
  /**
   * Create a message for `reason`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {Options | null | undefined} [options]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | Options | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns
   *   Instance of `VFileMessage`.
   */
  // eslint-disable-next-line complexity
  constructor(e, t, r) {
    super(), typeof t == "string" && (r = t, t = void 0);
    let i = "", o = {}, s = !1;
    if (t && ("line" in t && "column" in t ? o = { place: t } : "start" in t && "end" in t ? o = { place: t } : "type" in t ? o = {
      ancestors: [t],
      place: t.position
    } : o = { ...t }), typeof e == "string" ? i = e : !o.cause && e && (s = !0, i = e.message, o.cause = e), !o.ruleId && !o.source && typeof r == "string") {
      const a = r.indexOf(":");
      a === -1 ? o.ruleId = r : (o.source = r.slice(0, a), o.ruleId = r.slice(a + 1));
    }
    if (!o.place && o.ancestors && o.ancestors) {
      const a = o.ancestors[o.ancestors.length - 1];
      a && (o.place = a.position);
    }
    const l = o.place && "start" in o.place ? o.place.start : o.place;
    this.ancestors = o.ancestors || void 0, this.cause = o.cause || void 0, this.column = l ? l.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = l ? l.line : void 0, this.name = Bi(o.place) || "1:1", this.place = o.place || void 0, this.reason = this.message, this.ruleId = o.ruleId || void 0, this.source = o.source || void 0, this.stack = s && o.cause && typeof o.cause.stack == "string" ? o.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
We.prototype.file = "";
We.prototype.name = "";
We.prototype.reason = "";
We.prototype.message = "";
We.prototype.stack = "";
We.prototype.column = void 0;
We.prototype.line = void 0;
We.prototype.ancestors = void 0;
We.prototype.cause = void 0;
We.prototype.fatal = void 0;
We.prototype.place = void 0;
We.prototype.ruleId = void 0;
We.prototype.source = void 0;
const Nt = { basename: Qb, dirname: Zb, extname: ek, join: tk, sep: "/" };
function Qb(n, e) {
  if (e !== void 0 && typeof e != "string")
    throw new TypeError('"ext" argument must be a string');
  So(n);
  let t = 0, r = -1, i = n.length, o;
  if (e === void 0 || e.length === 0 || e.length > n.length) {
    for (; i--; )
      if (n.codePointAt(i) === 47) {
        if (o) {
          t = i + 1;
          break;
        }
      } else r < 0 && (o = !0, r = i + 1);
    return r < 0 ? "" : n.slice(t, r);
  }
  if (e === n)
    return "";
  let s = -1, l = e.length - 1;
  for (; i--; )
    if (n.codePointAt(i) === 47) {
      if (o) {
        t = i + 1;
        break;
      }
    } else
      s < 0 && (o = !0, s = i + 1), l > -1 && (n.codePointAt(i) === e.codePointAt(l--) ? l < 0 && (r = i) : (l = -1, r = s));
  return t === r ? r = s : r < 0 && (r = n.length), n.slice(t, r);
}
function Zb(n) {
  if (So(n), n.length === 0)
    return ".";
  let e = -1, t = n.length, r;
  for (; --t; )
    if (n.codePointAt(t) === 47) {
      if (r) {
        e = t;
        break;
      }
    } else r || (r = !0);
  return e < 0 ? n.codePointAt(0) === 47 ? "/" : "." : e === 1 && n.codePointAt(0) === 47 ? "//" : n.slice(0, e);
}
function ek(n) {
  So(n);
  let e = n.length, t = -1, r = 0, i = -1, o = 0, s;
  for (; e--; ) {
    const l = n.codePointAt(e);
    if (l === 47) {
      if (s) {
        r = e + 1;
        break;
      }
      continue;
    }
    t < 0 && (s = !0, t = e + 1), l === 46 ? i < 0 ? i = e : o !== 1 && (o = 1) : i > -1 && (o = -1);
  }
  return i < 0 || t < 0 || // We saw a non-dot character immediately before the dot.
  o === 0 || // The (right-most) trimmed path component is exactly `..`.
  o === 1 && i === t - 1 && i === r + 1 ? "" : n.slice(i, t);
}
function tk(...n) {
  let e = -1, t;
  for (; ++e < n.length; )
    So(n[e]), n[e] && (t = t === void 0 ? n[e] : t + "/" + n[e]);
  return t === void 0 ? "." : nk(t);
}
function nk(n) {
  So(n);
  const e = n.codePointAt(0) === 47;
  let t = rk(n, !e);
  return t.length === 0 && !e && (t = "."), t.length > 0 && n.codePointAt(n.length - 1) === 47 && (t += "/"), e ? "/" + t : t;
}
function rk(n, e) {
  let t = "", r = 0, i = -1, o = 0, s = -1, l, a;
  for (; ++s <= n.length; ) {
    if (s < n.length)
      l = n.codePointAt(s);
    else {
      if (l === 47)
        break;
      l = 47;
    }
    if (l === 47) {
      if (!(i === s - 1 || o === 1)) if (i !== s - 1 && o === 2) {
        if (t.length < 2 || r !== 2 || t.codePointAt(t.length - 1) !== 46 || t.codePointAt(t.length - 2) !== 46) {
          if (t.length > 2) {
            if (a = t.lastIndexOf("/"), a !== t.length - 1) {
              a < 0 ? (t = "", r = 0) : (t = t.slice(0, a), r = t.length - 1 - t.lastIndexOf("/")), i = s, o = 0;
              continue;
            }
          } else if (t.length > 0) {
            t = "", r = 0, i = s, o = 0;
            continue;
          }
        }
        e && (t = t.length > 0 ? t + "/.." : "..", r = 2);
      } else
        t.length > 0 ? t += "/" + n.slice(i + 1, s) : t = n.slice(i + 1, s), r = s - i - 1;
      i = s, o = 0;
    } else l === 46 && o > -1 ? o++ : o = -1;
  }
  return t;
}
function So(n) {
  if (typeof n != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(n)
    );
}
const ik = { cwd: ok };
function ok() {
  return "/";
}
function za(n) {
  return !!(n !== null && typeof n == "object" && "href" in n && n.href && "protocol" in n && n.protocol && // @ts-expect-error: indexing is fine.
  n.auth === void 0);
}
function sk(n) {
  if (typeof n == "string")
    n = new URL(n);
  else if (!za(n)) {
    const e = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + n + "`"
    );
    throw e.code = "ERR_INVALID_ARG_TYPE", e;
  }
  if (n.protocol !== "file:") {
    const e = new TypeError("The URL must be of scheme file");
    throw e.code = "ERR_INVALID_URL_SCHEME", e;
  }
  return lk(n);
}
function lk(n) {
  if (n.hostname !== "") {
    const r = new TypeError(
      'File URL host must be "localhost" or empty on darwin'
    );
    throw r.code = "ERR_INVALID_FILE_URL_HOST", r;
  }
  const e = n.pathname;
  let t = -1;
  for (; ++t < e.length; )
    if (e.codePointAt(t) === 37 && e.codePointAt(t + 1) === 50) {
      const r = e.codePointAt(t + 2);
      if (r === 70 || r === 102) {
        const i = new TypeError(
          "File URL path must not include encoded / characters"
        );
        throw i.code = "ERR_INVALID_FILE_URL_PATH", i;
      }
    }
  return decodeURIComponent(e);
}
const Pl = (
  /** @type {const} */
  [
    "history",
    "path",
    "basename",
    "stem",
    "extname",
    "dirname"
  ]
);
class ak {
  /**
   * Create a new virtual file.
   *
   * `options` is treated as:
   *
   * *   `string` or `Uint8Array` — `{value: options}`
   * *   `URL` — `{path: options}`
   * *   `VFile` — shallow copies its data over to the new file
   * *   `object` — all fields are shallow copied over to the new file
   *
   * Path related fields are set in the following order (least specific to
   * most specific): `history`, `path`, `basename`, `stem`, `extname`,
   * `dirname`.
   *
   * You cannot set `dirname` or `extname` without setting either `history`,
   * `path`, `basename`, or `stem` too.
   *
   * @param {Compatible | null | undefined} [value]
   *   File value.
   * @returns
   *   New instance.
   */
  constructor(e) {
    let t;
    e ? za(e) ? t = { path: e } : typeof e == "string" || ck(e) ? t = { value: e } : t = e : t = {}, this.cwd = "cwd" in t ? "" : ik.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < Pl.length; ) {
      const o = Pl[r];
      o in t && t[o] !== void 0 && t[o] !== null && (this[o] = o === "history" ? [...t[o]] : t[o]);
    }
    let i;
    for (i in t)
      Pl.includes(i) || (this[i] = t[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? Nt.basename(this.path) : void 0;
  }
  /**
   * Set basename (including extname) (`'index.min.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} basename
   *   Basename.
   * @returns {undefined}
   *   Nothing.
   */
  set basename(e) {
    $l(e, "basename"), Bl(e, "basename"), this.path = Nt.join(this.dirname || "", e);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? Nt.dirname(this.path) : void 0;
  }
  /**
   * Set the parent path (example: `'~'`).
   *
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} dirname
   *   Dirname.
   * @returns {undefined}
   *   Nothing.
   */
  set dirname(e) {
    Dd(this.basename, "dirname"), this.path = Nt.join(e || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? Nt.extname(this.path) : void 0;
  }
  /**
   * Set the extname (including dot) (example: `'.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} extname
   *   Extname.
   * @returns {undefined}
   *   Nothing.
   */
  set extname(e) {
    if (Bl(e, "extname"), Dd(this.dirname, "extname"), e) {
      if (e.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (e.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = Nt.join(this.dirname, this.stem + (e || ""));
  }
  /**
   * Get the full path (example: `'~/index.min.js'`).
   *
   * @returns {string}
   *   Path.
   */
  get path() {
    return this.history[this.history.length - 1];
  }
  /**
   * Set the full path (example: `'~/index.min.js'`).
   *
   * Cannot be nullified.
   * You can set a file URL (a `URL` object with a `file:` protocol) which will
   * be turned into a path with `url.fileURLToPath`.
   *
   * @param {URL | string} path
   *   Path.
   * @returns {undefined}
   *   Nothing.
   */
  set path(e) {
    za(e) && (e = sk(e)), $l(e, "path"), this.path !== e && this.history.push(e);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? Nt.basename(this.path, this.extname) : void 0;
  }
  /**
   * Set the stem (basename w/o extname) (example: `'index.min'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} stem
   *   Stem.
   * @returns {undefined}
   *   Nothing.
   */
  set stem(e) {
    $l(e, "stem"), Bl(e, "stem"), this.path = Nt.join(this.dirname || "", e + (this.extname || ""));
  }
  // Normal prototypal methods.
  /**
   * Create a fatal message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `true` (error; file not usable)
   * and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {never}
   *   Never.
   * @throws {VFileMessage}
   *   Message.
   */
  fail(e, t, r) {
    const i = this.message(e, t, r);
    throw i.fatal = !0, i;
  }
  /**
   * Create an info message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `undefined` (info; change
   * likely not needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  info(e, t, r) {
    const i = this.message(e, t, r);
    return i.fatal = void 0, i;
  }
  /**
   * Create a message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `false` (warning; change may be
   * needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  message(e, t, r) {
    const i = new We(
      // @ts-expect-error: the overloads are fine.
      e,
      t,
      r
    );
    return this.path && (i.name = this.path + ":" + i.name, i.file = this.path), i.fatal = !1, this.messages.push(i), i;
  }
  /**
   * Serialize the file.
   *
   * > **Note**: which encodings are supported depends on the engine.
   * > For info on Node.js, see:
   * > <https://nodejs.org/api/util.html#whatwg-supported-encodings>.
   *
   * @param {string | null | undefined} [encoding='utf8']
   *   Character encoding to understand `value` as when it’s a `Uint8Array`
   *   (default: `'utf-8'`).
   * @returns {string}
   *   Serialized file.
   */
  toString(e) {
    return this.value === void 0 ? "" : typeof this.value == "string" ? this.value : new TextDecoder(e || void 0).decode(this.value);
  }
}
function Bl(n, e) {
  if (n && n.includes(Nt.sep))
    throw new Error(
      "`" + e + "` cannot be a path: did not expect `" + Nt.sep + "`"
    );
}
function $l(n, e) {
  if (!n)
    throw new Error("`" + e + "` cannot be empty");
}
function Dd(n, e) {
  if (!n)
    throw new Error("Setting `" + e + "` requires `path` to be set too");
}
function ck(n) {
  return !!(n && typeof n == "object" && "byteLength" in n && "byteOffset" in n);
}
const uk = (
  /**
   * @type {new <Parameters extends Array<unknown>, Result>(property: string | symbol) => (...parameters: Parameters) => Result}
   */
  /** @type {unknown} */
  /**
   * @this {Function}
   * @param {string | symbol} property
   * @returns {(...parameters: Array<unknown>) => unknown}
   */
  (function(n) {
    const r = (
      /** @type {Record<string | symbol, Function>} */
      // Prototypes do exist.
      // type-coverage:ignore-next-line
      this.constructor.prototype
    ), i = r[n], o = function() {
      return i.apply(o, arguments);
    };
    return Object.setPrototypeOf(o, r), o;
  })
), dk = {}.hasOwnProperty;
class Rc extends uk {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = Yb();
  }
  /**
   * Copy a processor.
   *
   * @deprecated
   *   This is a private internal method and should not be used.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   New *unfrozen* processor ({@linkcode Processor}) that is
   *   configured to work the same as its ancestor.
   *   When the descendant processor is configured in the future it does not
   *   affect the ancestral processor.
   */
  copy() {
    const e = (
      /** @type {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>} */
      new Rc()
    );
    let t = -1;
    for (; ++t < this.attachers.length; ) {
      const r = this.attachers[t];
      e.use(...r);
    }
    return e.data(Ll(!0, {}, this.namespace)), e;
  }
  /**
   * Configure the processor with info available to all plugins.
   * Information is stored in an object.
   *
   * Typically, options can be given to a specific plugin, but sometimes it
   * makes sense to have information shared with several plugins.
   * For example, a list of HTML elements that are self-closing, which is
   * needed during all phases.
   *
   * > **Note**: setting information cannot occur on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * > **Note**: to register custom data in TypeScript, augment the
   * > {@linkcode Data} interface.
   *
   * @example
   *   This example show how to get and set info:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   const processor = unified().data('alpha', 'bravo')
   *
   *   processor.data('alpha') // => 'bravo'
   *
   *   processor.data() // => {alpha: 'bravo'}
   *
   *   processor.data({charlie: 'delta'})
   *
   *   processor.data() // => {charlie: 'delta'}
   *   ```
   *
   * @template {keyof Data} Key
   *
   * @overload
   * @returns {Data}
   *
   * @overload
   * @param {Data} dataset
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Key} key
   * @returns {Data[Key]}
   *
   * @overload
   * @param {Key} key
   * @param {Data[Key]} value
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @param {Data | Key} [key]
   *   Key to get or set, or entire dataset to set, or nothing to get the
   *   entire dataset (optional).
   * @param {Data[Key]} [value]
   *   Value to set (optional).
   * @returns {unknown}
   *   The current processor when setting, the value at `key` when getting, or
   *   the entire dataset when getting without key.
   */
  data(e, t) {
    return typeof e == "string" ? arguments.length === 2 ? (_l("data", this.frozen), this.namespace[e] = t, this) : dk.call(this.namespace, e) && this.namespace[e] || void 0 : e ? (_l("data", this.frozen), this.namespace = e, this) : this.namespace;
  }
  /**
   * Freeze a processor.
   *
   * Frozen processors are meant to be extended and not to be configured
   * directly.
   *
   * When a processor is frozen it cannot be unfrozen.
   * New processors working the same way can be created by calling the
   * processor.
   *
   * It’s possible to freeze processors explicitly by calling `.freeze()`.
   * Processors freeze automatically when `.parse()`, `.run()`, `.runSync()`,
   * `.stringify()`, `.process()`, or `.processSync()` are called.
   *
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   The current processor.
   */
  freeze() {
    if (this.frozen)
      return this;
    const e = (
      /** @type {Processor} */
      /** @type {unknown} */
      this
    );
    for (; ++this.freezeIndex < this.attachers.length; ) {
      const [t, ...r] = this.attachers[this.freezeIndex];
      if (r[0] === !1)
        continue;
      r[0] === !0 && (r[0] = void 0);
      const i = t.call(e, ...r);
      typeof i == "function" && this.transformers.use(i);
    }
    return this.frozen = !0, this.freezeIndex = Number.POSITIVE_INFINITY, this;
  }
  /**
   * Parse text to a syntax tree.
   *
   * > **Note**: `parse` freezes the processor if not already *frozen*.
   *
   * > **Note**: `parse` performs the parse phase, not the run phase or other
   * > phases.
   *
   * @param {Compatible | undefined} [file]
   *   file to parse (optional); typically `string` or `VFile`; any value
   *   accepted as `x` in `new VFile(x)`.
   * @returns {ParseTree extends undefined ? Node : ParseTree}
   *   Syntax tree representing `file`.
   */
  parse(e) {
    this.freeze();
    const t = jo(e), r = this.parser || this.Parser;
    return zl("parse", r), r(String(t), t);
  }
  /**
   * Process the given file as configured on the processor.
   *
   * > **Note**: `process` freezes the processor if not already *frozen*.
   *
   * > **Note**: `process` performs the parse, run, and stringify phases.
   *
   * @overload
   * @param {Compatible | undefined} file
   * @param {ProcessCallback<VFileWithOutput<CompileResult>>} done
   * @returns {undefined}
   *
   * @overload
   * @param {Compatible | undefined} [file]
   * @returns {Promise<VFileWithOutput<CompileResult>>}
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`]; any value accepted as
   *   `x` in `new VFile(x)`.
   * @param {ProcessCallback<VFileWithOutput<CompileResult>> | undefined} [done]
   *   Callback (optional).
   * @returns {Promise<VFile> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise a promise, rejected with a fatal error or resolved with the
   *   processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  process(e, t) {
    const r = this;
    return this.freeze(), zl("process", this.parser || this.Parser), Fl("process", this.compiler || this.Compiler), t ? i(void 0, t) : new Promise(i);
    function i(o, s) {
      const l = jo(e), a = (
        /** @type {HeadTree extends undefined ? Node : HeadTree} */
        /** @type {unknown} */
        r.parse(l)
      );
      r.run(a, l, function(u, d, h) {
        if (u || !d || !h)
          return c(u);
        const f = (
          /** @type {CompileTree extends undefined ? Node : CompileTree} */
          /** @type {unknown} */
          d
        ), p = r.stringify(f, h);
        fk(p) ? h.value = p : h.result = p, c(
          u,
          /** @type {VFileWithOutput<CompileResult>} */
          h
        );
      });
      function c(u, d) {
        u || !d ? s(u) : o ? o(d) : t(void 0, d);
      }
    }
  }
  /**
   * Process the given file as configured on the processor.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `processSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `processSync` performs the parse, run, and stringify phases.
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`; any value accepted as
   *   `x` in `new VFile(x)`.
   * @returns {VFileWithOutput<CompileResult>}
   *   The processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  processSync(e) {
    let t = !1, r;
    return this.freeze(), zl("processSync", this.parser || this.Parser), Fl("processSync", this.compiler || this.Compiler), this.process(e, i), Pd("processSync", "process", t), r;
    function i(o, s) {
      t = !0, Id(o), r = s;
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * > **Note**: `run` freezes the processor if not already *frozen*.
   *
   * > **Note**: `run` performs the run phase, not other phases.
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} file
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} [file]
   * @returns {Promise<TailTree extends undefined ? Node : TailTree>}
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {(
   *   RunCallback<TailTree extends undefined ? Node : TailTree> |
   *   Compatible
   * )} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} [done]
   *   Callback (optional).
   * @returns {Promise<TailTree extends undefined ? Node : TailTree> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise, a promise rejected with a fatal error or resolved with the
   *   transformed tree.
   */
  run(e, t, r) {
    Ld(e), this.freeze();
    const i = this.transformers;
    return !r && typeof t == "function" && (r = t, t = void 0), r ? o(void 0, r) : new Promise(o);
    function o(s, l) {
      const a = jo(t);
      i.run(e, a, c);
      function c(u, d, h) {
        const f = (
          /** @type {TailTree extends undefined ? Node : TailTree} */
          d || e
        );
        u ? l(u) : s ? s(f) : r(void 0, f, h);
      }
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `runSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `runSync` performs the run phase, not other phases.
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {TailTree extends undefined ? Node : TailTree}
   *   Transformed tree.
   */
  runSync(e, t) {
    let r = !1, i;
    return this.run(e, t, o), Pd("runSync", "run", r), i;
    function o(s, l) {
      Id(s), i = l, r = !0;
    }
  }
  /**
   * Compile a syntax tree.
   *
   * > **Note**: `stringify` freezes the processor if not already *frozen*.
   *
   * > **Note**: `stringify` performs the stringify phase, not the run phase
   * > or other phases.
   *
   * @param {CompileTree extends undefined ? Node : CompileTree} tree
   *   Tree to compile.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {CompileResult extends undefined ? Value : CompileResult}
   *   Textual representation of the tree (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most compilers
   *   > return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  stringify(e, t) {
    this.freeze();
    const r = jo(t), i = this.compiler || this.Compiler;
    return Fl("stringify", i), Ld(e), i(e, r);
  }
  /**
   * Configure the processor to use a plugin, a list of usable values, or a
   * preset.
   *
   * If the processor is already using a plugin, the previous plugin
   * configuration is changed based on the options that are passed in.
   * In other words, the plugin is not added a second time.
   *
   * > **Note**: `use` cannot be called on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * @example
   *   There are many ways to pass plugins to `.use()`.
   *   This example gives an overview:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   unified()
   *     // Plugin with options:
   *     .use(pluginA, {x: true, y: true})
   *     // Passing the same plugin again merges configuration (to `{x: true, y: false, z: true}`):
   *     .use(pluginA, {y: false, z: true})
   *     // Plugins:
   *     .use([pluginB, pluginC])
   *     // Two plugins, the second with options:
   *     .use([pluginD, [pluginE, {}]])
   *     // Preset with plugins and settings:
   *     .use({plugins: [pluginF, [pluginG, {}]], settings: {position: false}})
   *     // Settings only:
   *     .use({settings: {position: false}})
   *   ```
   *
   * @template {Array<unknown>} [Parameters=[]]
   * @template {Node | string | undefined} [Input=undefined]
   * @template [Output=Input]
   *
   * @overload
   * @param {Preset | null | undefined} [preset]
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {PluggableList} list
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Plugin<Parameters, Input, Output>} plugin
   * @param {...(Parameters | [boolean])} parameters
   * @returns {UsePlugin<ParseTree, HeadTree, TailTree, CompileTree, CompileResult, Input, Output>}
   *
   * @param {PluggableList | Plugin | Preset | null | undefined} value
   *   Usable value.
   * @param {...unknown} parameters
   *   Parameters, when a plugin is given as a usable value.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   Current processor.
   */
  use(e, ...t) {
    const r = this.attachers, i = this.namespace;
    if (_l("use", this.frozen), e != null) if (typeof e == "function")
      a(e, t);
    else if (typeof e == "object")
      Array.isArray(e) ? l(e) : s(e);
    else
      throw new TypeError("Expected usable value, not `" + e + "`");
    return this;
    function o(c) {
      if (typeof c == "function")
        a(c, []);
      else if (typeof c == "object")
        if (Array.isArray(c)) {
          const [u, ...d] = (
            /** @type {PluginTuple<Array<unknown>>} */
            c
          );
          a(u, d);
        } else
          s(c);
      else
        throw new TypeError("Expected usable value, not `" + c + "`");
    }
    function s(c) {
      if (!("plugins" in c) && !("settings" in c))
        throw new Error(
          "Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither"
        );
      l(c.plugins), c.settings && (i.settings = Ll(!0, i.settings, c.settings));
    }
    function l(c) {
      let u = -1;
      if (c != null) if (Array.isArray(c))
        for (; ++u < c.length; ) {
          const d = c[u];
          o(d);
        }
      else
        throw new TypeError("Expected a list of plugins, not `" + c + "`");
    }
    function a(c, u) {
      let d = -1, h = -1;
      for (; ++d < r.length; )
        if (r[d][0] === c) {
          h = d;
          break;
        }
      if (h === -1)
        r.push([c, ...u]);
      else if (u.length > 0) {
        let [f, ...p] = u;
        const m = r[h][1];
        Ba(m) && Ba(f) && (f = Ll(!0, m, f)), r[h] = [c, f, ...p];
      }
    }
  }
}
const Xi = new Rc().freeze();
function zl(n, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + n + "` without `parser`");
}
function Fl(n, e) {
  if (typeof e != "function")
    throw new TypeError("Cannot `" + n + "` without `compiler`");
}
function _l(n, e) {
  if (e)
    throw new Error(
      "Cannot call `" + n + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function Ld(n) {
  if (!Ba(n) || typeof n.type != "string")
    throw new TypeError("Expected node, got `" + n + "`");
}
function Pd(n, e, t) {
  if (!t)
    throw new Error(
      "`" + n + "` finished async. Use `" + e + "` instead"
    );
}
function jo(n) {
  return hk(n) ? n : new ak(n);
}
function hk(n) {
  return !!(n && typeof n == "object" && "message" in n && "messages" in n);
}
function fk(n) {
  return typeof n == "string" || pk(n);
}
function pk(n) {
  return !!(n && typeof n == "object" && "byteLength" in n && "byteOffset" in n);
}
const Bd = document.createElement("i");
function Dc(n) {
  const e = "&" + n + ";";
  Bd.innerHTML = e;
  const t = Bd.textContent;
  return (
    // @ts-expect-error: TypeScript is wrong that `textContent` on elements can
    // yield `null`.
    t.charCodeAt(t.length - 1) === 59 && n !== "semi" || t === e ? !1 : t
  );
}
function et(n, e, t, r) {
  const i = n.length;
  let o = 0, s;
  if (e < 0 ? e = -e > i ? 0 : i + e : e = e > i ? i : e, t = t > 0 ? t : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(e, t), n.splice(...s);
  else
    for (t && n.splice(e, t); o < r.length; )
      s = r.slice(o, o + 1e4), s.unshift(e, 0), n.splice(...s), o += 1e4, e += 1e4;
}
function ut(n, e) {
  return n.length > 0 ? (et(n, n.length, 0, e), n) : e;
}
const $d = {}.hasOwnProperty;
function Qf(n) {
  const e = {};
  let t = -1;
  for (; ++t < n.length; )
    mk(e, n[t]);
  return e;
}
function mk(n, e) {
  let t;
  for (t in e) {
    const i = ($d.call(n, t) ? n[t] : void 0) || (n[t] = {}), o = e[t];
    let s;
    if (o)
      for (s in o) {
        $d.call(i, s) || (i[s] = []);
        const l = o[s];
        gk(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(l) ? l : l ? [l] : []
        );
      }
  }
}
function gk(n, e) {
  let t = -1;
  const r = [];
  for (; ++t < e.length; )
    (e[t].add === "after" ? n : r).push(e[t]);
  et(n, 0, 0, r);
}
function Zf(n, e) {
  const t = Number.parseInt(n, e);
  return (
    // C0 except for HT, LF, FF, CR, space.
    t < 9 || t === 11 || t > 13 && t < 32 || // Control character (DEL) of C0, and C1 controls.
    t > 126 && t < 160 || // Lone high surrogates and low surrogates.
    t > 55295 && t < 57344 || // Noncharacters.
    t > 64975 && t < 65008 || /* eslint-disable no-bitwise */
    (t & 65535) === 65535 || (t & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    t > 1114111 ? "�" : String.fromCodePoint(t)
  );
}
function Et(n) {
  return n.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const Pe = Rn(/[A-Za-z]/), Oe = Rn(/[\dA-Za-z]/), yk = Rn(/[#-'*+\--9=?A-Z^-~]/);
function Rs(n) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    n !== null && (n < 32 || n === 127)
  );
}
const Fa = Rn(/\d/), bk = Rn(/[\dA-Fa-f]/), kk = Rn(/[!-/:-@[-`{-~]/);
function F(n) {
  return n !== null && n < -2;
}
function le(n) {
  return n !== null && (n < 0 || n === 32);
}
function Y(n) {
  return n === -2 || n === -1 || n === 32;
}
const nl = Rn(/\p{P}|\p{S}/u), sr = Rn(/\s/);
function Rn(n) {
  return e;
  function e(t) {
    return t !== null && t > -1 && n.test(String.fromCharCode(t));
  }
}
function ii(n) {
  const e = [];
  let t = -1, r = 0, i = 0;
  for (; ++t < n.length; ) {
    const o = n.charCodeAt(t);
    let s = "";
    if (o === 37 && Oe(n.charCodeAt(t + 1)) && Oe(n.charCodeAt(t + 2)))
      i = 2;
    else if (o < 128)
      /[!#$&-;=?-Z_a-z~]/.test(String.fromCharCode(o)) || (s = String.fromCharCode(o));
    else if (o > 55295 && o < 57344) {
      const l = n.charCodeAt(t + 1);
      o < 56320 && l > 56319 && l < 57344 ? (s = String.fromCharCode(o, l), i = 1) : s = "�";
    } else
      s = String.fromCharCode(o);
    s && (e.push(n.slice(r, t), encodeURIComponent(s)), r = t + i + 1, s = ""), i && (t += i, i = 0);
  }
  return e.join("") + n.slice(r);
}
function Z(n, e, t, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let o = 0;
  return s;
  function s(a) {
    return Y(a) ? (n.enter(t), l(a)) : e(a);
  }
  function l(a) {
    return Y(a) && o++ < i ? (n.consume(a), l) : (n.exit(t), e(a));
  }
}
const wk = {
  tokenize: Ck
};
function Ck(n) {
  const e = n.attempt(this.parser.constructs.contentInitial, r, i);
  let t;
  return e;
  function r(l) {
    if (l === null) {
      n.consume(l);
      return;
    }
    return n.enter("lineEnding"), n.consume(l), n.exit("lineEnding"), Z(n, e, "linePrefix");
  }
  function i(l) {
    return n.enter("paragraph"), o(l);
  }
  function o(l) {
    const a = n.enter("chunkText", {
      contentType: "text",
      previous: t
    });
    return t && (t.next = a), t = a, s(l);
  }
  function s(l) {
    if (l === null) {
      n.exit("chunkText"), n.exit("paragraph"), n.consume(l);
      return;
    }
    return F(l) ? (n.consume(l), n.exit("chunkText"), o) : (n.consume(l), s);
  }
}
const Sk = {
  tokenize: xk
}, zd = {
  tokenize: vk
};
function xk(n) {
  const e = this, t = [];
  let r = 0, i, o, s;
  return l;
  function l(x) {
    if (r < t.length) {
      const L = t[r];
      return e.containerState = L[1], n.attempt(L[0].continuation, a, c)(x);
    }
    return c(x);
  }
  function a(x) {
    if (r++, e.containerState._closeFlow) {
      e.containerState._closeFlow = void 0, i && C();
      const L = e.events.length;
      let D = L, w;
      for (; D--; )
        if (e.events[D][0] === "exit" && e.events[D][1].type === "chunkFlow") {
          w = e.events[D][1].end;
          break;
        }
      g(r);
      let A = L;
      for (; A < e.events.length; )
        e.events[A][1].end = {
          ...w
        }, A++;
      return et(e.events, D + 1, 0, e.events.slice(L)), e.events.length = A, c(x);
    }
    return l(x);
  }
  function c(x) {
    if (r === t.length) {
      if (!i)
        return h(x);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return p(x);
      e.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return e.containerState = {}, n.check(zd, u, d)(x);
  }
  function u(x) {
    return i && C(), g(r), h(x);
  }
  function d(x) {
    return e.parser.lazy[e.now().line] = r !== t.length, s = e.now().offset, p(x);
  }
  function h(x) {
    return e.containerState = {}, n.attempt(zd, f, p)(x);
  }
  function f(x) {
    return r++, t.push([e.currentConstruct, e.containerState]), h(x);
  }
  function p(x) {
    if (x === null) {
      i && C(), g(0), n.consume(x);
      return;
    }
    return i = i || e.parser.flow(e.now()), n.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: o
    }), m(x);
  }
  function m(x) {
    if (x === null) {
      y(n.exit("chunkFlow"), !0), g(0), n.consume(x);
      return;
    }
    return F(x) ? (n.consume(x), y(n.exit("chunkFlow")), r = 0, e.interrupt = void 0, l) : (n.consume(x), m);
  }
  function y(x, L) {
    const D = e.sliceStream(x);
    if (L && D.push(null), x.previous = o, o && (o.next = x), o = x, i.defineSkip(x.start), i.write(D), e.parser.lazy[x.start.line]) {
      let w = i.events.length;
      for (; w--; )
        if (
          // The token starts before the line ending…
          i.events[w][1].start.offset < s && // …and either is not ended yet…
          (!i.events[w][1].end || // …or ends after it.
          i.events[w][1].end.offset > s)
        )
          return;
      const A = e.events.length;
      let B = A, H, S;
      for (; B--; )
        if (e.events[B][0] === "exit" && e.events[B][1].type === "chunkFlow") {
          if (H) {
            S = e.events[B][1].end;
            break;
          }
          H = !0;
        }
      for (g(r), w = A; w < e.events.length; )
        e.events[w][1].end = {
          ...S
        }, w++;
      et(e.events, B + 1, 0, e.events.slice(A)), e.events.length = w;
    }
  }
  function g(x) {
    let L = t.length;
    for (; L-- > x; ) {
      const D = t[L];
      e.containerState = D[1], D[0].exit.call(e, n);
    }
    t.length = x;
  }
  function C() {
    i.write([null]), o = void 0, i = void 0, e.containerState._closeFlow = void 0;
  }
}
function vk(n, e, t) {
  return Z(n, n.attempt(this.parser.constructs.document, e, t), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function Xr(n) {
  if (n === null || le(n) || sr(n))
    return 1;
  if (nl(n))
    return 2;
}
function rl(n, e, t) {
  const r = [];
  let i = -1;
  for (; ++i < n.length; ) {
    const o = n[i].resolveAll;
    o && !r.includes(o) && (e = o(e, t), r.push(o));
  }
  return e;
}
const _a = {
  name: "attention",
  resolveAll: Ek,
  tokenize: Mk
};
function Ek(n, e) {
  let t = -1, r, i, o, s, l, a, c, u;
  for (; ++t < n.length; )
    if (n[t][0] === "enter" && n[t][1].type === "attentionSequence" && n[t][1]._close) {
      for (r = t; r--; )
        if (n[r][0] === "exit" && n[r][1].type === "attentionSequence" && n[r][1]._open && // If the markers are the same:
        e.sliceSerialize(n[r][1]).charCodeAt(0) === e.sliceSerialize(n[t][1]).charCodeAt(0)) {
          if ((n[r][1]._close || n[t][1]._open) && (n[t][1].end.offset - n[t][1].start.offset) % 3 && !((n[r][1].end.offset - n[r][1].start.offset + n[t][1].end.offset - n[t][1].start.offset) % 3))
            continue;
          a = n[r][1].end.offset - n[r][1].start.offset > 1 && n[t][1].end.offset - n[t][1].start.offset > 1 ? 2 : 1;
          const d = {
            ...n[r][1].end
          }, h = {
            ...n[t][1].start
          };
          Fd(d, -a), Fd(h, a), s = {
            type: a > 1 ? "strongSequence" : "emphasisSequence",
            start: d,
            end: {
              ...n[r][1].end
            }
          }, l = {
            type: a > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...n[t][1].start
            },
            end: h
          }, o = {
            type: a > 1 ? "strongText" : "emphasisText",
            start: {
              ...n[r][1].end
            },
            end: {
              ...n[t][1].start
            }
          }, i = {
            type: a > 1 ? "strong" : "emphasis",
            start: {
              ...s.start
            },
            end: {
              ...l.end
            }
          }, n[r][1].end = {
            ...s.start
          }, n[t][1].start = {
            ...l.end
          }, c = [], n[r][1].end.offset - n[r][1].start.offset && (c = ut(c, [["enter", n[r][1], e], ["exit", n[r][1], e]])), c = ut(c, [["enter", i, e], ["enter", s, e], ["exit", s, e], ["enter", o, e]]), c = ut(c, rl(e.parser.constructs.insideSpan.null, n.slice(r + 1, t), e)), c = ut(c, [["exit", o, e], ["enter", l, e], ["exit", l, e], ["exit", i, e]]), n[t][1].end.offset - n[t][1].start.offset ? (u = 2, c = ut(c, [["enter", n[t][1], e], ["exit", n[t][1], e]])) : u = 0, et(n, r - 1, t - r + 3, c), t = r + c.length - u - 2;
          break;
        }
    }
  for (t = -1; ++t < n.length; )
    n[t][1].type === "attentionSequence" && (n[t][1].type = "data");
  return n;
}
function Mk(n, e) {
  const t = this.parser.constructs.attentionMarkers.null, r = this.previous, i = Xr(r);
  let o;
  return s;
  function s(a) {
    return o = a, n.enter("attentionSequence"), l(a);
  }
  function l(a) {
    if (a === o)
      return n.consume(a), l;
    const c = n.exit("attentionSequence"), u = Xr(a), d = !u || u === 2 && i || t.includes(a), h = !i || i === 2 && u || t.includes(r);
    return c._open = !!(o === 42 ? d : d && (i || !h)), c._close = !!(o === 42 ? h : h && (u || !d)), e(a);
  }
}
function Fd(n, e) {
  n.column += e, n.offset += e, n._bufferIndex += e;
}
const Tk = {
  name: "autolink",
  tokenize: Nk
};
function Nk(n, e, t) {
  let r = 0;
  return i;
  function i(f) {
    return n.enter("autolink"), n.enter("autolinkMarker"), n.consume(f), n.exit("autolinkMarker"), n.enter("autolinkProtocol"), o;
  }
  function o(f) {
    return Pe(f) ? (n.consume(f), s) : f === 64 ? t(f) : c(f);
  }
  function s(f) {
    return f === 43 || f === 45 || f === 46 || Oe(f) ? (r = 1, l(f)) : c(f);
  }
  function l(f) {
    return f === 58 ? (n.consume(f), r = 0, a) : (f === 43 || f === 45 || f === 46 || Oe(f)) && r++ < 32 ? (n.consume(f), l) : (r = 0, c(f));
  }
  function a(f) {
    return f === 62 ? (n.exit("autolinkProtocol"), n.enter("autolinkMarker"), n.consume(f), n.exit("autolinkMarker"), n.exit("autolink"), e) : f === null || f === 32 || f === 60 || Rs(f) ? t(f) : (n.consume(f), a);
  }
  function c(f) {
    return f === 64 ? (n.consume(f), u) : yk(f) ? (n.consume(f), c) : t(f);
  }
  function u(f) {
    return Oe(f) ? d(f) : t(f);
  }
  function d(f) {
    return f === 46 ? (n.consume(f), r = 0, u) : f === 62 ? (n.exit("autolinkProtocol").type = "autolinkEmail", n.enter("autolinkMarker"), n.consume(f), n.exit("autolinkMarker"), n.exit("autolink"), e) : h(f);
  }
  function h(f) {
    if ((f === 45 || Oe(f)) && r++ < 63) {
      const p = f === 45 ? h : d;
      return n.consume(f), p;
    }
    return t(f);
  }
}
const xo = {
  partial: !0,
  tokenize: Ik
};
function Ik(n, e, t) {
  return r;
  function r(o) {
    return Y(o) ? Z(n, i, "linePrefix")(o) : i(o);
  }
  function i(o) {
    return o === null || F(o) ? e(o) : t(o);
  }
}
const ep = {
  continuation: {
    tokenize: Ok
  },
  exit: Rk,
  name: "blockQuote",
  tokenize: Ak
};
function Ak(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    if (s === 62) {
      const l = r.containerState;
      return l.open || (n.enter("blockQuote", {
        _container: !0
      }), l.open = !0), n.enter("blockQuotePrefix"), n.enter("blockQuoteMarker"), n.consume(s), n.exit("blockQuoteMarker"), o;
    }
    return t(s);
  }
  function o(s) {
    return Y(s) ? (n.enter("blockQuotePrefixWhitespace"), n.consume(s), n.exit("blockQuotePrefixWhitespace"), n.exit("blockQuotePrefix"), e) : (n.exit("blockQuotePrefix"), e(s));
  }
}
function Ok(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return Y(s) ? Z(n, o, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : o(s);
  }
  function o(s) {
    return n.attempt(ep, e, t)(s);
  }
}
function Rk(n) {
  n.exit("blockQuote");
}
const tp = {
  name: "characterEscape",
  tokenize: Dk
};
function Dk(n, e, t) {
  return r;
  function r(o) {
    return n.enter("characterEscape"), n.enter("escapeMarker"), n.consume(o), n.exit("escapeMarker"), i;
  }
  function i(o) {
    return kk(o) ? (n.enter("characterEscapeValue"), n.consume(o), n.exit("characterEscapeValue"), n.exit("characterEscape"), e) : t(o);
  }
}
const np = {
  name: "characterReference",
  tokenize: Lk
};
function Lk(n, e, t) {
  const r = this;
  let i = 0, o, s;
  return l;
  function l(d) {
    return n.enter("characterReference"), n.enter("characterReferenceMarker"), n.consume(d), n.exit("characterReferenceMarker"), a;
  }
  function a(d) {
    return d === 35 ? (n.enter("characterReferenceMarkerNumeric"), n.consume(d), n.exit("characterReferenceMarkerNumeric"), c) : (n.enter("characterReferenceValue"), o = 31, s = Oe, u(d));
  }
  function c(d) {
    return d === 88 || d === 120 ? (n.enter("characterReferenceMarkerHexadecimal"), n.consume(d), n.exit("characterReferenceMarkerHexadecimal"), n.enter("characterReferenceValue"), o = 6, s = bk, u) : (n.enter("characterReferenceValue"), o = 7, s = Fa, u(d));
  }
  function u(d) {
    if (d === 59 && i) {
      const h = n.exit("characterReferenceValue");
      return s === Oe && !Dc(r.sliceSerialize(h)) ? t(d) : (n.enter("characterReferenceMarker"), n.consume(d), n.exit("characterReferenceMarker"), n.exit("characterReference"), e);
    }
    return s(d) && i++ < o ? (n.consume(d), u) : t(d);
  }
}
const _d = {
  partial: !0,
  tokenize: Bk
}, Hd = {
  concrete: !0,
  name: "codeFenced",
  tokenize: Pk
};
function Pk(n, e, t) {
  const r = this, i = {
    partial: !0,
    tokenize: D
  };
  let o = 0, s = 0, l;
  return a;
  function a(w) {
    return c(w);
  }
  function c(w) {
    const A = r.events[r.events.length - 1];
    return o = A && A[1].type === "linePrefix" ? A[2].sliceSerialize(A[1], !0).length : 0, l = w, n.enter("codeFenced"), n.enter("codeFencedFence"), n.enter("codeFencedFenceSequence"), u(w);
  }
  function u(w) {
    return w === l ? (s++, n.consume(w), u) : s < 3 ? t(w) : (n.exit("codeFencedFenceSequence"), Y(w) ? Z(n, d, "whitespace")(w) : d(w));
  }
  function d(w) {
    return w === null || F(w) ? (n.exit("codeFencedFence"), r.interrupt ? e(w) : n.check(_d, m, L)(w)) : (n.enter("codeFencedFenceInfo"), n.enter("chunkString", {
      contentType: "string"
    }), h(w));
  }
  function h(w) {
    return w === null || F(w) ? (n.exit("chunkString"), n.exit("codeFencedFenceInfo"), d(w)) : Y(w) ? (n.exit("chunkString"), n.exit("codeFencedFenceInfo"), Z(n, f, "whitespace")(w)) : w === 96 && w === l ? t(w) : (n.consume(w), h);
  }
  function f(w) {
    return w === null || F(w) ? d(w) : (n.enter("codeFencedFenceMeta"), n.enter("chunkString", {
      contentType: "string"
    }), p(w));
  }
  function p(w) {
    return w === null || F(w) ? (n.exit("chunkString"), n.exit("codeFencedFenceMeta"), d(w)) : w === 96 && w === l ? t(w) : (n.consume(w), p);
  }
  function m(w) {
    return n.attempt(i, L, y)(w);
  }
  function y(w) {
    return n.enter("lineEnding"), n.consume(w), n.exit("lineEnding"), g;
  }
  function g(w) {
    return o > 0 && Y(w) ? Z(n, C, "linePrefix", o + 1)(w) : C(w);
  }
  function C(w) {
    return w === null || F(w) ? n.check(_d, m, L)(w) : (n.enter("codeFlowValue"), x(w));
  }
  function x(w) {
    return w === null || F(w) ? (n.exit("codeFlowValue"), C(w)) : (n.consume(w), x);
  }
  function L(w) {
    return n.exit("codeFenced"), e(w);
  }
  function D(w, A, B) {
    let H = 0;
    return S;
    function S(te) {
      return w.enter("lineEnding"), w.consume(te), w.exit("lineEnding"), $;
    }
    function $(te) {
      return w.enter("codeFencedFence"), Y(te) ? Z(w, z, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(te) : z(te);
    }
    function z(te) {
      return te === l ? (w.enter("codeFencedFenceSequence"), ie(te)) : B(te);
    }
    function ie(te) {
      return te === l ? (H++, w.consume(te), ie) : H >= s ? (w.exit("codeFencedFenceSequence"), Y(te) ? Z(w, de, "whitespace")(te) : de(te)) : B(te);
    }
    function de(te) {
      return te === null || F(te) ? (w.exit("codeFencedFence"), A(te)) : B(te);
    }
  }
}
function Bk(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? t(s) : (n.enter("lineEnding"), n.consume(s), n.exit("lineEnding"), o);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? t(s) : e(s);
  }
}
const Hl = {
  name: "codeIndented",
  tokenize: zk
}, $k = {
  partial: !0,
  tokenize: Fk
};
function zk(n, e, t) {
  const r = this;
  return i;
  function i(c) {
    return n.enter("codeIndented"), Z(n, o, "linePrefix", 5)(c);
  }
  function o(c) {
    const u = r.events[r.events.length - 1];
    return u && u[1].type === "linePrefix" && u[2].sliceSerialize(u[1], !0).length >= 4 ? s(c) : t(c);
  }
  function s(c) {
    return c === null ? a(c) : F(c) ? n.attempt($k, s, a)(c) : (n.enter("codeFlowValue"), l(c));
  }
  function l(c) {
    return c === null || F(c) ? (n.exit("codeFlowValue"), s(c)) : (n.consume(c), l);
  }
  function a(c) {
    return n.exit("codeIndented"), e(c);
  }
}
function Fk(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? t(s) : F(s) ? (n.enter("lineEnding"), n.consume(s), n.exit("lineEnding"), i) : Z(n, o, "linePrefix", 5)(s);
  }
  function o(s) {
    const l = r.events[r.events.length - 1];
    return l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : F(s) ? i(s) : t(s);
  }
}
const _k = {
  name: "codeText",
  previous: qk,
  resolve: Hk,
  tokenize: jk
};
function Hk(n) {
  let e = n.length - 4, t = 3, r, i;
  if ((n[t][1].type === "lineEnding" || n[t][1].type === "space") && (n[e][1].type === "lineEnding" || n[e][1].type === "space")) {
    for (r = t; ++r < e; )
      if (n[r][1].type === "codeTextData") {
        n[t][1].type = "codeTextPadding", n[e][1].type = "codeTextPadding", t += 2, e -= 2;
        break;
      }
  }
  for (r = t - 1, e++; ++r <= e; )
    i === void 0 ? r !== e && n[r][1].type !== "lineEnding" && (i = r) : (r === e || n[r][1].type === "lineEnding") && (n[i][1].type = "codeTextData", r !== i + 2 && (n[i][1].end = n[r - 1][1].end, n.splice(i + 2, r - i - 2), e -= r - i - 2, r = i + 2), i = void 0);
  return n;
}
function qk(n) {
  return n !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function jk(n, e, t) {
  let r = 0, i, o;
  return s;
  function s(d) {
    return n.enter("codeText"), n.enter("codeTextSequence"), l(d);
  }
  function l(d) {
    return d === 96 ? (n.consume(d), r++, l) : (n.exit("codeTextSequence"), a(d));
  }
  function a(d) {
    return d === null ? t(d) : d === 32 ? (n.enter("space"), n.consume(d), n.exit("space"), a) : d === 96 ? (o = n.enter("codeTextSequence"), i = 0, u(d)) : F(d) ? (n.enter("lineEnding"), n.consume(d), n.exit("lineEnding"), a) : (n.enter("codeTextData"), c(d));
  }
  function c(d) {
    return d === null || d === 32 || d === 96 || F(d) ? (n.exit("codeTextData"), a(d)) : (n.consume(d), c);
  }
  function u(d) {
    return d === 96 ? (n.consume(d), i++, u) : i === r ? (n.exit("codeTextSequence"), n.exit("codeText"), e(d)) : (o.type = "codeTextData", c(d));
  }
}
class Vk {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(e) {
    this.left = e ? [...e] : [], this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(e) {
    if (e < 0 || e >= this.left.length + this.right.length)
      throw new RangeError("Cannot access index `" + e + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    return e < this.left.length ? this.left[e] : this.right[this.right.length - e + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    return this.setCursor(0), this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(e, t) {
    const r = t ?? Number.POSITIVE_INFINITY;
    return r < this.left.length ? this.left.slice(e, r) : e > this.left.length ? this.right.slice(this.right.length - r + this.left.length, this.right.length - e + this.left.length).reverse() : this.left.slice(e).concat(this.right.slice(this.right.length - r + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(e, t, r) {
    const i = t || 0;
    this.setCursor(Math.trunc(e));
    const o = this.right.splice(this.right.length - i, Number.POSITIVE_INFINITY);
    return r && bi(this.left, r), o.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    return this.setCursor(Number.POSITIVE_INFINITY), this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(e) {
    this.setCursor(Number.POSITIVE_INFINITY), this.left.push(e);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(e) {
    this.setCursor(Number.POSITIVE_INFINITY), bi(this.left, e);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(e) {
    this.setCursor(0), this.right.push(e);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(e) {
    this.setCursor(0), bi(this.right, e.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(e) {
    if (!(e === this.left.length || e > this.left.length && this.right.length === 0 || e < 0 && this.left.length === 0))
      if (e < this.left.length) {
        const t = this.left.splice(e, Number.POSITIVE_INFINITY);
        bi(this.right, t.reverse());
      } else {
        const t = this.right.splice(this.left.length + this.right.length - e, Number.POSITIVE_INFINITY);
        bi(this.left, t.reverse());
      }
  }
}
function bi(n, e) {
  let t = 0;
  if (e.length < 1e4)
    n.push(...e);
  else
    for (; t < e.length; )
      n.push(...e.slice(t, t + 1e4)), t += 1e4;
}
function rp(n) {
  const e = {};
  let t = -1, r, i, o, s, l, a, c;
  const u = new Vk(n);
  for (; ++t < u.length; ) {
    for (; t in e; )
      t = e[t];
    if (r = u.get(t), t && r[1].type === "chunkFlow" && u.get(t - 1)[1].type === "listItemPrefix" && (a = r[1]._tokenizer.events, o = 0, o < a.length && a[o][1].type === "lineEndingBlank" && (o += 2), o < a.length && a[o][1].type === "content"))
      for (; ++o < a.length && a[o][1].type !== "content"; )
        a[o][1].type === "chunkText" && (a[o][1]._isInFirstContentOfListItem = !0, o++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(e, Uk(u, t)), t = e[t], c = !0);
    else if (r[1]._container) {
      for (o = t, i = void 0; o--; )
        if (s = u.get(o), s[1].type === "lineEnding" || s[1].type === "lineEndingBlank")
          s[0] === "enter" && (i && (u.get(i)[1].type = "lineEndingBlank"), s[1].type = "lineEnding", i = o);
        else if (!(s[1].type === "linePrefix" || s[1].type === "listItemIndent")) break;
      i && (r[1].end = {
        ...u.get(i)[1].start
      }, l = u.slice(i, t), l.unshift(r), u.splice(i, t - i + 1, l));
    }
  }
  return et(n, 0, Number.POSITIVE_INFINITY, u.slice(0)), !c;
}
function Uk(n, e) {
  const t = n.get(e)[1], r = n.get(e)[2];
  let i = e - 1;
  const o = [];
  let s = t._tokenizer;
  s || (s = r.parser[t.contentType](t.start), t._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const l = s.events, a = [], c = {};
  let u, d, h = -1, f = t, p = 0, m = 0;
  const y = [m];
  for (; f; ) {
    for (; n.get(++i)[1] !== f; )
      ;
    o.push(i), f._tokenizer || (u = r.sliceStream(f), f.next || u.push(null), d && s.defineSkip(f.start), f._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(u), f._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), d = f, f = f.next;
  }
  for (f = t; ++h < l.length; )
    // Find a void token that includes a break.
    l[h][0] === "exit" && l[h - 1][0] === "enter" && l[h][1].type === l[h - 1][1].type && l[h][1].start.line !== l[h][1].end.line && (m = h + 1, y.push(m), f._tokenizer = void 0, f.previous = void 0, f = f.next);
  for (s.events = [], f ? (f._tokenizer = void 0, f.previous = void 0) : y.pop(), h = y.length; h--; ) {
    const g = l.slice(y[h], y[h + 1]), C = o.pop();
    a.push([C, C + g.length - 1]), n.splice(C, 2, g);
  }
  for (a.reverse(), h = -1; ++h < a.length; )
    c[p + a[h][0]] = p + a[h][1], p += a[h][1] - a[h][0] - 1;
  return c;
}
const Wk = {
  resolve: Jk,
  tokenize: Gk
}, Kk = {
  partial: !0,
  tokenize: Yk
};
function Jk(n) {
  return rp(n), n;
}
function Gk(n, e) {
  let t;
  return r;
  function r(l) {
    return n.enter("content"), t = n.enter("chunkContent", {
      contentType: "content"
    }), i(l);
  }
  function i(l) {
    return l === null ? o(l) : F(l) ? n.check(Kk, s, o)(l) : (n.consume(l), i);
  }
  function o(l) {
    return n.exit("chunkContent"), n.exit("content"), e(l);
  }
  function s(l) {
    return n.consume(l), n.exit("chunkContent"), t.next = n.enter("chunkContent", {
      contentType: "content",
      previous: t
    }), t = t.next, i;
  }
}
function Yk(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return n.exit("chunkContent"), n.enter("lineEnding"), n.consume(s), n.exit("lineEnding"), Z(n, o, "linePrefix");
  }
  function o(s) {
    if (s === null || F(s))
      return t(s);
    const l = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && l && l[1].type === "linePrefix" && l[2].sliceSerialize(l[1], !0).length >= 4 ? e(s) : n.interrupt(r.parser.constructs.flow, t, e)(s);
  }
}
function ip(n, e, t, r, i, o, s, l, a) {
  const c = a || Number.POSITIVE_INFINITY;
  let u = 0;
  return d;
  function d(g) {
    return g === 60 ? (n.enter(r), n.enter(i), n.enter(o), n.consume(g), n.exit(o), h) : g === null || g === 32 || g === 41 || Rs(g) ? t(g) : (n.enter(r), n.enter(s), n.enter(l), n.enter("chunkString", {
      contentType: "string"
    }), m(g));
  }
  function h(g) {
    return g === 62 ? (n.enter(o), n.consume(g), n.exit(o), n.exit(i), n.exit(r), e) : (n.enter(l), n.enter("chunkString", {
      contentType: "string"
    }), f(g));
  }
  function f(g) {
    return g === 62 ? (n.exit("chunkString"), n.exit(l), h(g)) : g === null || g === 60 || F(g) ? t(g) : (n.consume(g), g === 92 ? p : f);
  }
  function p(g) {
    return g === 60 || g === 62 || g === 92 ? (n.consume(g), f) : f(g);
  }
  function m(g) {
    return !u && (g === null || g === 41 || le(g)) ? (n.exit("chunkString"), n.exit(l), n.exit(s), n.exit(r), e(g)) : u < c && g === 40 ? (n.consume(g), u++, m) : g === 41 ? (n.consume(g), u--, m) : g === null || g === 32 || g === 40 || Rs(g) ? t(g) : (n.consume(g), g === 92 ? y : m);
  }
  function y(g) {
    return g === 40 || g === 41 || g === 92 ? (n.consume(g), m) : m(g);
  }
}
function op(n, e, t, r, i, o) {
  const s = this;
  let l = 0, a;
  return c;
  function c(f) {
    return n.enter(r), n.enter(i), n.consume(f), n.exit(i), n.enter(o), u;
  }
  function u(f) {
    return l > 999 || f === null || f === 91 || f === 93 && !a || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    f === 94 && !l && "_hiddenFootnoteSupport" in s.parser.constructs ? t(f) : f === 93 ? (n.exit(o), n.enter(i), n.consume(f), n.exit(i), n.exit(r), e) : F(f) ? (n.enter("lineEnding"), n.consume(f), n.exit("lineEnding"), u) : (n.enter("chunkString", {
      contentType: "string"
    }), d(f));
  }
  function d(f) {
    return f === null || f === 91 || f === 93 || F(f) || l++ > 999 ? (n.exit("chunkString"), u(f)) : (n.consume(f), a || (a = !Y(f)), f === 92 ? h : d);
  }
  function h(f) {
    return f === 91 || f === 92 || f === 93 ? (n.consume(f), l++, d) : d(f);
  }
}
function sp(n, e, t, r, i, o) {
  let s;
  return l;
  function l(h) {
    return h === 34 || h === 39 || h === 40 ? (n.enter(r), n.enter(i), n.consume(h), n.exit(i), s = h === 40 ? 41 : h, a) : t(h);
  }
  function a(h) {
    return h === s ? (n.enter(i), n.consume(h), n.exit(i), n.exit(r), e) : (n.enter(o), c(h));
  }
  function c(h) {
    return h === s ? (n.exit(o), a(s)) : h === null ? t(h) : F(h) ? (n.enter("lineEnding"), n.consume(h), n.exit("lineEnding"), Z(n, c, "linePrefix")) : (n.enter("chunkString", {
      contentType: "string"
    }), u(h));
  }
  function u(h) {
    return h === s || h === null || F(h) ? (n.exit("chunkString"), c(h)) : (n.consume(h), h === 92 ? d : u);
  }
  function d(h) {
    return h === s || h === 92 ? (n.consume(h), u) : u(h);
  }
}
function $i(n, e) {
  let t;
  return r;
  function r(i) {
    return F(i) ? (n.enter("lineEnding"), n.consume(i), n.exit("lineEnding"), t = !0, r) : Y(i) ? Z(n, r, t ? "linePrefix" : "lineSuffix")(i) : e(i);
  }
}
const Xk = {
  name: "definition",
  tokenize: Zk
}, Qk = {
  partial: !0,
  tokenize: ew
};
function Zk(n, e, t) {
  const r = this;
  let i;
  return o;
  function o(f) {
    return n.enter("definition"), s(f);
  }
  function s(f) {
    return op.call(
      r,
      n,
      l,
      // Note: we don’t need to reset the way `markdown-rs` does.
      t,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(f);
  }
  function l(f) {
    return i = Et(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), f === 58 ? (n.enter("definitionMarker"), n.consume(f), n.exit("definitionMarker"), a) : t(f);
  }
  function a(f) {
    return le(f) ? $i(n, c)(f) : c(f);
  }
  function c(f) {
    return ip(
      n,
      u,
      // Note: we don’t need to reset the way `markdown-rs` does.
      t,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(f);
  }
  function u(f) {
    return n.attempt(Qk, d, d)(f);
  }
  function d(f) {
    return Y(f) ? Z(n, h, "whitespace")(f) : h(f);
  }
  function h(f) {
    return f === null || F(f) ? (n.exit("definition"), r.parser.defined.push(i), e(f)) : t(f);
  }
}
function ew(n, e, t) {
  return r;
  function r(l) {
    return le(l) ? $i(n, i)(l) : t(l);
  }
  function i(l) {
    return sp(n, o, t, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(l);
  }
  function o(l) {
    return Y(l) ? Z(n, s, "whitespace")(l) : s(l);
  }
  function s(l) {
    return l === null || F(l) ? e(l) : t(l);
  }
}
const tw = {
  name: "hardBreakEscape",
  tokenize: nw
};
function nw(n, e, t) {
  return r;
  function r(o) {
    return n.enter("hardBreakEscape"), n.consume(o), i;
  }
  function i(o) {
    return F(o) ? (n.exit("hardBreakEscape"), e(o)) : t(o);
  }
}
const rw = {
  name: "headingAtx",
  resolve: iw,
  tokenize: ow
};
function iw(n, e) {
  let t = n.length - 2, r = 3, i, o;
  return n[r][1].type === "whitespace" && (r += 2), t - 2 > r && n[t][1].type === "whitespace" && (t -= 2), n[t][1].type === "atxHeadingSequence" && (r === t - 1 || t - 4 > r && n[t - 2][1].type === "whitespace") && (t -= r + 1 === t ? 2 : 4), t > r && (i = {
    type: "atxHeadingText",
    start: n[r][1].start,
    end: n[t][1].end
  }, o = {
    type: "chunkText",
    start: n[r][1].start,
    end: n[t][1].end,
    contentType: "text"
  }, et(n, r, t - r + 1, [["enter", i, e], ["enter", o, e], ["exit", o, e], ["exit", i, e]])), n;
}
function ow(n, e, t) {
  let r = 0;
  return i;
  function i(u) {
    return n.enter("atxHeading"), o(u);
  }
  function o(u) {
    return n.enter("atxHeadingSequence"), s(u);
  }
  function s(u) {
    return u === 35 && r++ < 6 ? (n.consume(u), s) : u === null || le(u) ? (n.exit("atxHeadingSequence"), l(u)) : t(u);
  }
  function l(u) {
    return u === 35 ? (n.enter("atxHeadingSequence"), a(u)) : u === null || F(u) ? (n.exit("atxHeading"), e(u)) : Y(u) ? Z(n, l, "whitespace")(u) : (n.enter("atxHeadingText"), c(u));
  }
  function a(u) {
    return u === 35 ? (n.consume(u), a) : (n.exit("atxHeadingSequence"), l(u));
  }
  function c(u) {
    return u === null || u === 35 || le(u) ? (n.exit("atxHeadingText"), l(u)) : (n.consume(u), c);
  }
}
const sw = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
], qd = ["pre", "script", "style", "textarea"], lw = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: uw,
  tokenize: dw
}, aw = {
  partial: !0,
  tokenize: fw
}, cw = {
  partial: !0,
  tokenize: hw
};
function uw(n) {
  let e = n.length;
  for (; e-- && !(n[e][0] === "enter" && n[e][1].type === "htmlFlow"); )
    ;
  return e > 1 && n[e - 2][1].type === "linePrefix" && (n[e][1].start = n[e - 2][1].start, n[e + 1][1].start = n[e - 2][1].start, n.splice(e - 2, 2)), n;
}
function dw(n, e, t) {
  const r = this;
  let i, o, s, l, a;
  return c;
  function c(k) {
    return u(k);
  }
  function u(k) {
    return n.enter("htmlFlow"), n.enter("htmlFlowData"), n.consume(k), d;
  }
  function d(k) {
    return k === 33 ? (n.consume(k), h) : k === 47 ? (n.consume(k), o = !0, m) : k === 63 ? (n.consume(k), i = 3, r.interrupt ? e : b) : Pe(k) ? (n.consume(k), s = String.fromCharCode(k), y) : t(k);
  }
  function h(k) {
    return k === 45 ? (n.consume(k), i = 2, f) : k === 91 ? (n.consume(k), i = 5, l = 0, p) : Pe(k) ? (n.consume(k), i = 4, r.interrupt ? e : b) : t(k);
  }
  function f(k) {
    return k === 45 ? (n.consume(k), r.interrupt ? e : b) : t(k);
  }
  function p(k) {
    const wt = "CDATA[";
    return k === wt.charCodeAt(l++) ? (n.consume(k), l === wt.length ? r.interrupt ? e : z : p) : t(k);
  }
  function m(k) {
    return Pe(k) ? (n.consume(k), s = String.fromCharCode(k), y) : t(k);
  }
  function y(k) {
    if (k === null || k === 47 || k === 62 || le(k)) {
      const wt = k === 47, Bn = s.toLowerCase();
      return !wt && !o && qd.includes(Bn) ? (i = 1, r.interrupt ? e(k) : z(k)) : sw.includes(s.toLowerCase()) ? (i = 6, wt ? (n.consume(k), g) : r.interrupt ? e(k) : z(k)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? t(k) : o ? C(k) : x(k));
    }
    return k === 45 || Oe(k) ? (n.consume(k), s += String.fromCharCode(k), y) : t(k);
  }
  function g(k) {
    return k === 62 ? (n.consume(k), r.interrupt ? e : z) : t(k);
  }
  function C(k) {
    return Y(k) ? (n.consume(k), C) : S(k);
  }
  function x(k) {
    return k === 47 ? (n.consume(k), S) : k === 58 || k === 95 || Pe(k) ? (n.consume(k), L) : Y(k) ? (n.consume(k), x) : S(k);
  }
  function L(k) {
    return k === 45 || k === 46 || k === 58 || k === 95 || Oe(k) ? (n.consume(k), L) : D(k);
  }
  function D(k) {
    return k === 61 ? (n.consume(k), w) : Y(k) ? (n.consume(k), D) : x(k);
  }
  function w(k) {
    return k === null || k === 60 || k === 61 || k === 62 || k === 96 ? t(k) : k === 34 || k === 39 ? (n.consume(k), a = k, A) : Y(k) ? (n.consume(k), w) : B(k);
  }
  function A(k) {
    return k === a ? (n.consume(k), a = null, H) : k === null || F(k) ? t(k) : (n.consume(k), A);
  }
  function B(k) {
    return k === null || k === 34 || k === 39 || k === 47 || k === 60 || k === 61 || k === 62 || k === 96 || le(k) ? D(k) : (n.consume(k), B);
  }
  function H(k) {
    return k === 47 || k === 62 || Y(k) ? x(k) : t(k);
  }
  function S(k) {
    return k === 62 ? (n.consume(k), $) : t(k);
  }
  function $(k) {
    return k === null || F(k) ? z(k) : Y(k) ? (n.consume(k), $) : t(k);
  }
  function z(k) {
    return k === 45 && i === 2 ? (n.consume(k), Ie) : k === 60 && i === 1 ? (n.consume(k), ve) : k === 62 && i === 4 ? (n.consume(k), kt) : k === 63 && i === 3 ? (n.consume(k), b) : k === 93 && i === 5 ? (n.consume(k), $t) : F(k) && (i === 6 || i === 7) ? (n.exit("htmlFlowData"), n.check(aw, zt, ie)(k)) : k === null || F(k) ? (n.exit("htmlFlowData"), ie(k)) : (n.consume(k), z);
  }
  function ie(k) {
    return n.check(cw, de, zt)(k);
  }
  function de(k) {
    return n.enter("lineEnding"), n.consume(k), n.exit("lineEnding"), te;
  }
  function te(k) {
    return k === null || F(k) ? ie(k) : (n.enter("htmlFlowData"), z(k));
  }
  function Ie(k) {
    return k === 45 ? (n.consume(k), b) : z(k);
  }
  function ve(k) {
    return k === 47 ? (n.consume(k), s = "", bt) : z(k);
  }
  function bt(k) {
    if (k === 62) {
      const wt = s.toLowerCase();
      return qd.includes(wt) ? (n.consume(k), kt) : z(k);
    }
    return Pe(k) && s.length < 8 ? (n.consume(k), s += String.fromCharCode(k), bt) : z(k);
  }
  function $t(k) {
    return k === 93 ? (n.consume(k), b) : z(k);
  }
  function b(k) {
    return k === 62 ? (n.consume(k), kt) : k === 45 && i === 2 ? (n.consume(k), b) : z(k);
  }
  function kt(k) {
    return k === null || F(k) ? (n.exit("htmlFlowData"), zt(k)) : (n.consume(k), kt);
  }
  function zt(k) {
    return n.exit("htmlFlow"), e(k);
  }
}
function hw(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return F(s) ? (n.enter("lineEnding"), n.consume(s), n.exit("lineEnding"), o) : t(s);
  }
  function o(s) {
    return r.parser.lazy[r.now().line] ? t(s) : e(s);
  }
}
function fw(n, e, t) {
  return r;
  function r(i) {
    return n.enter("lineEnding"), n.consume(i), n.exit("lineEnding"), n.attempt(xo, e, t);
  }
}
const pw = {
  name: "htmlText",
  tokenize: mw
};
function mw(n, e, t) {
  const r = this;
  let i, o, s;
  return l;
  function l(b) {
    return n.enter("htmlText"), n.enter("htmlTextData"), n.consume(b), a;
  }
  function a(b) {
    return b === 33 ? (n.consume(b), c) : b === 47 ? (n.consume(b), D) : b === 63 ? (n.consume(b), x) : Pe(b) ? (n.consume(b), B) : t(b);
  }
  function c(b) {
    return b === 45 ? (n.consume(b), u) : b === 91 ? (n.consume(b), o = 0, p) : Pe(b) ? (n.consume(b), C) : t(b);
  }
  function u(b) {
    return b === 45 ? (n.consume(b), f) : t(b);
  }
  function d(b) {
    return b === null ? t(b) : b === 45 ? (n.consume(b), h) : F(b) ? (s = d, ve(b)) : (n.consume(b), d);
  }
  function h(b) {
    return b === 45 ? (n.consume(b), f) : d(b);
  }
  function f(b) {
    return b === 62 ? Ie(b) : b === 45 ? h(b) : d(b);
  }
  function p(b) {
    const kt = "CDATA[";
    return b === kt.charCodeAt(o++) ? (n.consume(b), o === kt.length ? m : p) : t(b);
  }
  function m(b) {
    return b === null ? t(b) : b === 93 ? (n.consume(b), y) : F(b) ? (s = m, ve(b)) : (n.consume(b), m);
  }
  function y(b) {
    return b === 93 ? (n.consume(b), g) : m(b);
  }
  function g(b) {
    return b === 62 ? Ie(b) : b === 93 ? (n.consume(b), g) : m(b);
  }
  function C(b) {
    return b === null || b === 62 ? Ie(b) : F(b) ? (s = C, ve(b)) : (n.consume(b), C);
  }
  function x(b) {
    return b === null ? t(b) : b === 63 ? (n.consume(b), L) : F(b) ? (s = x, ve(b)) : (n.consume(b), x);
  }
  function L(b) {
    return b === 62 ? Ie(b) : x(b);
  }
  function D(b) {
    return Pe(b) ? (n.consume(b), w) : t(b);
  }
  function w(b) {
    return b === 45 || Oe(b) ? (n.consume(b), w) : A(b);
  }
  function A(b) {
    return F(b) ? (s = A, ve(b)) : Y(b) ? (n.consume(b), A) : Ie(b);
  }
  function B(b) {
    return b === 45 || Oe(b) ? (n.consume(b), B) : b === 47 || b === 62 || le(b) ? H(b) : t(b);
  }
  function H(b) {
    return b === 47 ? (n.consume(b), Ie) : b === 58 || b === 95 || Pe(b) ? (n.consume(b), S) : F(b) ? (s = H, ve(b)) : Y(b) ? (n.consume(b), H) : Ie(b);
  }
  function S(b) {
    return b === 45 || b === 46 || b === 58 || b === 95 || Oe(b) ? (n.consume(b), S) : $(b);
  }
  function $(b) {
    return b === 61 ? (n.consume(b), z) : F(b) ? (s = $, ve(b)) : Y(b) ? (n.consume(b), $) : H(b);
  }
  function z(b) {
    return b === null || b === 60 || b === 61 || b === 62 || b === 96 ? t(b) : b === 34 || b === 39 ? (n.consume(b), i = b, ie) : F(b) ? (s = z, ve(b)) : Y(b) ? (n.consume(b), z) : (n.consume(b), de);
  }
  function ie(b) {
    return b === i ? (n.consume(b), i = void 0, te) : b === null ? t(b) : F(b) ? (s = ie, ve(b)) : (n.consume(b), ie);
  }
  function de(b) {
    return b === null || b === 34 || b === 39 || b === 60 || b === 61 || b === 96 ? t(b) : b === 47 || b === 62 || le(b) ? H(b) : (n.consume(b), de);
  }
  function te(b) {
    return b === 47 || b === 62 || le(b) ? H(b) : t(b);
  }
  function Ie(b) {
    return b === 62 ? (n.consume(b), n.exit("htmlTextData"), n.exit("htmlText"), e) : t(b);
  }
  function ve(b) {
    return n.exit("htmlTextData"), n.enter("lineEnding"), n.consume(b), n.exit("lineEnding"), bt;
  }
  function bt(b) {
    return Y(b) ? Z(n, $t, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(b) : $t(b);
  }
  function $t(b) {
    return n.enter("htmlTextData"), s(b);
  }
}
const Lc = {
  name: "labelEnd",
  resolveAll: kw,
  resolveTo: ww,
  tokenize: Cw
}, gw = {
  tokenize: Sw
}, yw = {
  tokenize: xw
}, bw = {
  tokenize: vw
};
function kw(n) {
  let e = -1;
  const t = [];
  for (; ++e < n.length; ) {
    const r = n[e][1];
    if (t.push(n[e]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", e += i;
    }
  }
  return n.length !== t.length && et(n, 0, n.length, t), n;
}
function ww(n, e) {
  let t = n.length, r = 0, i, o, s, l;
  for (; t--; )
    if (i = n[t][1], o) {
      if (i.type === "link" || i.type === "labelLink" && i._inactive)
        break;
      n[t][0] === "enter" && i.type === "labelLink" && (i._inactive = !0);
    } else if (s) {
      if (n[t][0] === "enter" && (i.type === "labelImage" || i.type === "labelLink") && !i._balanced && (o = t, i.type !== "labelLink")) {
        r = 2;
        break;
      }
    } else i.type === "labelEnd" && (s = t);
  const a = {
    type: n[o][1].type === "labelLink" ? "link" : "image",
    start: {
      ...n[o][1].start
    },
    end: {
      ...n[n.length - 1][1].end
    }
  }, c = {
    type: "label",
    start: {
      ...n[o][1].start
    },
    end: {
      ...n[s][1].end
    }
  }, u = {
    type: "labelText",
    start: {
      ...n[o + r + 2][1].end
    },
    end: {
      ...n[s - 2][1].start
    }
  };
  return l = [["enter", a, e], ["enter", c, e]], l = ut(l, n.slice(o + 1, o + r + 3)), l = ut(l, [["enter", u, e]]), l = ut(l, rl(e.parser.constructs.insideSpan.null, n.slice(o + r + 4, s - 3), e)), l = ut(l, [["exit", u, e], n[s - 2], n[s - 1], ["exit", c, e]]), l = ut(l, n.slice(s + 1)), l = ut(l, [["exit", a, e]]), et(n, o, n.length, l), n;
}
function Cw(n, e, t) {
  const r = this;
  let i = r.events.length, o, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      o = r.events[i][1];
      break;
    }
  return l;
  function l(h) {
    return o ? o._inactive ? d(h) : (s = r.parser.defined.includes(Et(r.sliceSerialize({
      start: o.end,
      end: r.now()
    }))), n.enter("labelEnd"), n.enter("labelMarker"), n.consume(h), n.exit("labelMarker"), n.exit("labelEnd"), a) : t(h);
  }
  function a(h) {
    return h === 40 ? n.attempt(gw, u, s ? u : d)(h) : h === 91 ? n.attempt(yw, u, s ? c : d)(h) : s ? u(h) : d(h);
  }
  function c(h) {
    return n.attempt(bw, u, d)(h);
  }
  function u(h) {
    return e(h);
  }
  function d(h) {
    return o._balanced = !0, t(h);
  }
}
function Sw(n, e, t) {
  return r;
  function r(d) {
    return n.enter("resource"), n.enter("resourceMarker"), n.consume(d), n.exit("resourceMarker"), i;
  }
  function i(d) {
    return le(d) ? $i(n, o)(d) : o(d);
  }
  function o(d) {
    return d === 41 ? u(d) : ip(n, s, l, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(d);
  }
  function s(d) {
    return le(d) ? $i(n, a)(d) : u(d);
  }
  function l(d) {
    return t(d);
  }
  function a(d) {
    return d === 34 || d === 39 || d === 40 ? sp(n, c, t, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(d) : u(d);
  }
  function c(d) {
    return le(d) ? $i(n, u)(d) : u(d);
  }
  function u(d) {
    return d === 41 ? (n.enter("resourceMarker"), n.consume(d), n.exit("resourceMarker"), n.exit("resource"), e) : t(d);
  }
}
function xw(n, e, t) {
  const r = this;
  return i;
  function i(l) {
    return op.call(r, n, o, s, "reference", "referenceMarker", "referenceString")(l);
  }
  function o(l) {
    return r.parser.defined.includes(Et(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? e(l) : t(l);
  }
  function s(l) {
    return t(l);
  }
}
function vw(n, e, t) {
  return r;
  function r(o) {
    return n.enter("reference"), n.enter("referenceMarker"), n.consume(o), n.exit("referenceMarker"), i;
  }
  function i(o) {
    return o === 93 ? (n.enter("referenceMarker"), n.consume(o), n.exit("referenceMarker"), n.exit("reference"), e) : t(o);
  }
}
const Ew = {
  name: "labelStartImage",
  resolveAll: Lc.resolveAll,
  tokenize: Mw
};
function Mw(n, e, t) {
  const r = this;
  return i;
  function i(l) {
    return n.enter("labelImage"), n.enter("labelImageMarker"), n.consume(l), n.exit("labelImageMarker"), o;
  }
  function o(l) {
    return l === 91 ? (n.enter("labelMarker"), n.consume(l), n.exit("labelMarker"), n.exit("labelImage"), s) : t(l);
  }
  function s(l) {
    return l === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? t(l) : e(l);
  }
}
const Tw = {
  name: "labelStartLink",
  resolveAll: Lc.resolveAll,
  tokenize: Nw
};
function Nw(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return n.enter("labelLink"), n.enter("labelMarker"), n.consume(s), n.exit("labelMarker"), n.exit("labelLink"), o;
  }
  function o(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? t(s) : e(s);
  }
}
const ql = {
  name: "lineEnding",
  tokenize: Iw
};
function Iw(n, e) {
  return t;
  function t(r) {
    return n.enter("lineEnding"), n.consume(r), n.exit("lineEnding"), Z(n, e, "linePrefix");
  }
}
const rs = {
  name: "thematicBreak",
  tokenize: Aw
};
function Aw(n, e, t) {
  let r = 0, i;
  return o;
  function o(c) {
    return n.enter("thematicBreak"), s(c);
  }
  function s(c) {
    return i = c, l(c);
  }
  function l(c) {
    return c === i ? (n.enter("thematicBreakSequence"), a(c)) : r >= 3 && (c === null || F(c)) ? (n.exit("thematicBreak"), e(c)) : t(c);
  }
  function a(c) {
    return c === i ? (n.consume(c), r++, a) : (n.exit("thematicBreakSequence"), Y(c) ? Z(n, l, "whitespace")(c) : l(c));
  }
}
const _e = {
  continuation: {
    tokenize: Lw
  },
  exit: Bw,
  name: "list",
  tokenize: Dw
}, Ow = {
  partial: !0,
  tokenize: $w
}, Rw = {
  partial: !0,
  tokenize: Pw
};
function Dw(n, e, t) {
  const r = this, i = r.events[r.events.length - 1];
  let o = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return l;
  function l(f) {
    const p = r.containerState.type || (f === 42 || f === 43 || f === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !r.containerState.marker || f === r.containerState.marker : Fa(f)) {
      if (r.containerState.type || (r.containerState.type = p, n.enter(p, {
        _container: !0
      })), p === "listUnordered")
        return n.enter("listItemPrefix"), f === 42 || f === 45 ? n.check(rs, t, c)(f) : c(f);
      if (!r.interrupt || f === 49)
        return n.enter("listItemPrefix"), n.enter("listItemValue"), a(f);
    }
    return t(f);
  }
  function a(f) {
    return Fa(f) && ++s < 10 ? (n.consume(f), a) : (!r.interrupt || s < 2) && (r.containerState.marker ? f === r.containerState.marker : f === 41 || f === 46) ? (n.exit("listItemValue"), c(f)) : t(f);
  }
  function c(f) {
    return n.enter("listItemMarker"), n.consume(f), n.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || f, n.check(
      xo,
      // Can’t be empty when interrupting.
      r.interrupt ? t : u,
      n.attempt(Ow, h, d)
    );
  }
  function u(f) {
    return r.containerState.initialBlankLine = !0, o++, h(f);
  }
  function d(f) {
    return Y(f) ? (n.enter("listItemPrefixWhitespace"), n.consume(f), n.exit("listItemPrefixWhitespace"), h) : t(f);
  }
  function h(f) {
    return r.containerState.size = o + r.sliceSerialize(n.exit("listItemPrefix"), !0).length, e(f);
  }
}
function Lw(n, e, t) {
  const r = this;
  return r.containerState._closeFlow = void 0, n.check(xo, i, o);
  function i(l) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, Z(n, e, "listItemIndent", r.containerState.size + 1)(l);
  }
  function o(l) {
    return r.containerState.furtherBlankLines || !Y(l) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(l)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, n.attempt(Rw, e, s)(l));
  }
  function s(l) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, Z(n, n.attempt(_e, e, t), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(l);
  }
}
function Pw(n, e, t) {
  const r = this;
  return Z(n, i, "listItemIndent", r.containerState.size + 1);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? e(o) : t(o);
  }
}
function Bw(n) {
  n.exit(this.containerState.type);
}
function $w(n, e, t) {
  const r = this;
  return Z(n, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return !Y(o) && s && s[1].type === "listItemPrefixWhitespace" ? e(o) : t(o);
  }
}
const jd = {
  name: "setextUnderline",
  resolveTo: zw,
  tokenize: Fw
};
function zw(n, e) {
  let t = n.length, r, i, o;
  for (; t--; )
    if (n[t][0] === "enter") {
      if (n[t][1].type === "content") {
        r = t;
        break;
      }
      n[t][1].type === "paragraph" && (i = t);
    } else
      n[t][1].type === "content" && n.splice(t, 1), !o && n[t][1].type === "definition" && (o = t);
  const s = {
    type: "setextHeading",
    start: {
      ...n[r][1].start
    },
    end: {
      ...n[n.length - 1][1].end
    }
  };
  return n[i][1].type = "setextHeadingText", o ? (n.splice(i, 0, ["enter", s, e]), n.splice(o + 1, 0, ["exit", n[r][1], e]), n[r][1].end = {
    ...n[o][1].end
  }) : n[r][1] = s, n.push(["exit", s, e]), n;
}
function Fw(n, e, t) {
  const r = this;
  let i;
  return o;
  function o(c) {
    let u = r.events.length, d;
    for (; u--; )
      if (r.events[u][1].type !== "lineEnding" && r.events[u][1].type !== "linePrefix" && r.events[u][1].type !== "content") {
        d = r.events[u][1].type === "paragraph";
        break;
      }
    return !r.parser.lazy[r.now().line] && (r.interrupt || d) ? (n.enter("setextHeadingLine"), i = c, s(c)) : t(c);
  }
  function s(c) {
    return n.enter("setextHeadingLineSequence"), l(c);
  }
  function l(c) {
    return c === i ? (n.consume(c), l) : (n.exit("setextHeadingLineSequence"), Y(c) ? Z(n, a, "lineSuffix")(c) : a(c));
  }
  function a(c) {
    return c === null || F(c) ? (n.exit("setextHeadingLine"), e(c)) : t(c);
  }
}
const _w = {
  tokenize: Hw
};
function Hw(n) {
  const e = this, t = n.attempt(
    // Try to parse a blank line.
    xo,
    r,
    // Try to parse initial flow (essentially, only code).
    n.attempt(this.parser.constructs.flowInitial, i, Z(n, n.attempt(this.parser.constructs.flow, i, n.attempt(Wk, i)), "linePrefix"))
  );
  return t;
  function r(o) {
    if (o === null) {
      n.consume(o);
      return;
    }
    return n.enter("lineEndingBlank"), n.consume(o), n.exit("lineEndingBlank"), e.currentConstruct = void 0, t;
  }
  function i(o) {
    if (o === null) {
      n.consume(o);
      return;
    }
    return n.enter("lineEnding"), n.consume(o), n.exit("lineEnding"), e.currentConstruct = void 0, t;
  }
}
const qw = {
  resolveAll: ap()
}, jw = lp("string"), Vw = lp("text");
function lp(n) {
  return {
    resolveAll: ap(n === "text" ? Uw : void 0),
    tokenize: e
  };
  function e(t) {
    const r = this, i = this.parser.constructs[n], o = t.attempt(i, s, l);
    return s;
    function s(u) {
      return c(u) ? o(u) : l(u);
    }
    function l(u) {
      if (u === null) {
        t.consume(u);
        return;
      }
      return t.enter("data"), t.consume(u), a;
    }
    function a(u) {
      return c(u) ? (t.exit("data"), o(u)) : (t.consume(u), a);
    }
    function c(u) {
      if (u === null)
        return !0;
      const d = i[u];
      let h = -1;
      if (d)
        for (; ++h < d.length; ) {
          const f = d[h];
          if (!f.previous || f.previous.call(r, r.previous))
            return !0;
        }
      return !1;
    }
  }
}
function ap(n) {
  return e;
  function e(t, r) {
    let i = -1, o;
    for (; ++i <= t.length; )
      o === void 0 ? t[i] && t[i][1].type === "data" && (o = i, i++) : (!t[i] || t[i][1].type !== "data") && (i !== o + 2 && (t[o][1].end = t[i - 1][1].end, t.splice(o + 2, i - o - 2), i = o + 2), o = void 0);
    return n ? n(t, r) : t;
  }
}
function Uw(n, e) {
  let t = 0;
  for (; ++t <= n.length; )
    if ((t === n.length || n[t][1].type === "lineEnding") && n[t - 1][1].type === "data") {
      const r = n[t - 1][1], i = e.sliceStream(r);
      let o = i.length, s = -1, l = 0, a;
      for (; o--; ) {
        const c = i[o];
        if (typeof c == "string") {
          for (s = c.length; c.charCodeAt(s - 1) === 32; )
            l++, s--;
          if (s) break;
          s = -1;
        } else if (c === -2)
          a = !0, l++;
        else if (c !== -1) {
          o++;
          break;
        }
      }
      if (e._contentTypeTextTrailing && t === n.length && (l = 0), l) {
        const c = {
          type: t === n.length || a || l < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: o ? s : r.start._bufferIndex + s,
            _index: r.start._index + o,
            line: r.end.line,
            column: r.end.column - l,
            offset: r.end.offset - l
          },
          end: {
            ...r.end
          }
        };
        r.end = {
          ...c.start
        }, r.start.offset === r.end.offset ? Object.assign(r, c) : (n.splice(t, 0, ["enter", c, e], ["exit", c, e]), t += 2);
      }
      t++;
    }
  return n;
}
const Ww = {
  42: _e,
  43: _e,
  45: _e,
  48: _e,
  49: _e,
  50: _e,
  51: _e,
  52: _e,
  53: _e,
  54: _e,
  55: _e,
  56: _e,
  57: _e,
  62: ep
}, Kw = {
  91: Xk
}, Jw = {
  [-2]: Hl,
  [-1]: Hl,
  32: Hl
}, Gw = {
  35: rw,
  42: rs,
  45: [jd, rs],
  60: lw,
  61: jd,
  95: rs,
  96: Hd,
  126: Hd
}, Yw = {
  38: np,
  92: tp
}, Xw = {
  [-5]: ql,
  [-4]: ql,
  [-3]: ql,
  33: Ew,
  38: np,
  42: _a,
  60: [Tk, pw],
  91: Tw,
  92: [tw, tp],
  93: Lc,
  95: _a,
  96: _k
}, Qw = {
  null: [_a, qw]
}, Zw = {
  null: [42, 95]
}, eC = {
  null: []
}, tC = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: Zw,
  contentInitial: Kw,
  disable: eC,
  document: Ww,
  flow: Gw,
  flowInitial: Jw,
  insideSpan: Qw,
  string: Yw,
  text: Xw
}, Symbol.toStringTag, { value: "Module" }));
function nC(n, e, t) {
  let r = {
    _bufferIndex: -1,
    _index: 0,
    line: t && t.line || 1,
    column: t && t.column || 1,
    offset: t && t.offset || 0
  };
  const i = {}, o = [];
  let s = [], l = [];
  const a = {
    attempt: A(D),
    check: A(w),
    consume: C,
    enter: x,
    exit: L,
    interrupt: A(w, {
      interrupt: !0
    })
  }, c = {
    code: null,
    containerState: {},
    defineSkip: m,
    events: [],
    now: p,
    parser: n,
    previous: null,
    sliceSerialize: h,
    sliceStream: f,
    write: d
  };
  let u = e.tokenize.call(c, a);
  return e.resolveAll && o.push(e), c;
  function d($) {
    return s = ut(s, $), y(), s[s.length - 1] !== null ? [] : (B(e, 0), c.events = rl(o, c.events, c), c.events);
  }
  function h($, z) {
    return iC(f($), z);
  }
  function f($) {
    return rC(s, $);
  }
  function p() {
    const {
      _bufferIndex: $,
      _index: z,
      line: ie,
      column: de,
      offset: te
    } = r;
    return {
      _bufferIndex: $,
      _index: z,
      line: ie,
      column: de,
      offset: te
    };
  }
  function m($) {
    i[$.line] = $.column, S();
  }
  function y() {
    let $;
    for (; r._index < s.length; ) {
      const z = s[r._index];
      if (typeof z == "string")
        for ($ = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === $ && r._bufferIndex < z.length; )
          g(z.charCodeAt(r._bufferIndex));
      else
        g(z);
    }
  }
  function g($) {
    u = u($);
  }
  function C($) {
    F($) ? (r.line++, r.column = 1, r.offset += $ === -3 ? 2 : 1, S()) : $ !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), c.previous = $;
  }
  function x($, z) {
    const ie = z || {};
    return ie.type = $, ie.start = p(), c.events.push(["enter", ie, c]), l.push(ie), ie;
  }
  function L($) {
    const z = l.pop();
    return z.end = p(), c.events.push(["exit", z, c]), z;
  }
  function D($, z) {
    B($, z.from);
  }
  function w($, z) {
    z.restore();
  }
  function A($, z) {
    return ie;
    function ie(de, te, Ie) {
      let ve, bt, $t, b;
      return Array.isArray(de) ? (
        /* c8 ignore next 1 */
        zt(de)
      ) : "tokenize" in de ? (
        // Looks like a construct.
        zt([
          /** @type {Construct} */
          de
        ])
      ) : kt(de);
      function kt(Ee) {
        return mi;
        function mi(un) {
          const gr = un !== null && Ee[un], yr = un !== null && Ee.null, qo = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(gr) ? gr : gr ? [gr] : [],
            ...Array.isArray(yr) ? yr : yr ? [yr] : []
          ];
          return zt(qo)(un);
        }
      }
      function zt(Ee) {
        return ve = Ee, bt = 0, Ee.length === 0 ? Ie : k(Ee[bt]);
      }
      function k(Ee) {
        return mi;
        function mi(un) {
          return b = H(), $t = Ee, Ee.partial || (c.currentConstruct = Ee), Ee.name && c.parser.constructs.disable.null.includes(Ee.name) ? Bn() : Ee.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            z ? Object.assign(Object.create(c), z) : c,
            a,
            wt,
            Bn
          )(un);
        }
      }
      function wt(Ee) {
        return $($t, b), te;
      }
      function Bn(Ee) {
        return b.restore(), ++bt < ve.length ? k(ve[bt]) : Ie;
      }
    }
  }
  function B($, z) {
    $.resolveAll && !o.includes($) && o.push($), $.resolve && et(c.events, z, c.events.length - z, $.resolve(c.events.slice(z), c)), $.resolveTo && (c.events = $.resolveTo(c.events, c));
  }
  function H() {
    const $ = p(), z = c.previous, ie = c.currentConstruct, de = c.events.length, te = Array.from(l);
    return {
      from: de,
      restore: Ie
    };
    function Ie() {
      r = $, c.previous = z, c.currentConstruct = ie, c.events.length = de, l = te, S();
    }
  }
  function S() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function rC(n, e) {
  const t = e.start._index, r = e.start._bufferIndex, i = e.end._index, o = e.end._bufferIndex;
  let s;
  if (t === i)
    s = [n[t].slice(r, o)];
  else {
    if (s = n.slice(t, i), r > -1) {
      const l = s[0];
      typeof l == "string" ? s[0] = l.slice(r) : s.shift();
    }
    o > 0 && s.push(n[i].slice(0, o));
  }
  return s;
}
function iC(n, e) {
  let t = -1;
  const r = [];
  let i;
  for (; ++t < n.length; ) {
    const o = n[t];
    let s;
    if (typeof o == "string")
      s = o;
    else switch (o) {
      case -5: {
        s = "\r";
        break;
      }
      case -4: {
        s = `
`;
        break;
      }
      case -3: {
        s = `\r
`;
        break;
      }
      case -2: {
        s = e ? " " : "	";
        break;
      }
      case -1: {
        if (!e && i) continue;
        s = " ";
        break;
      }
      default:
        s = String.fromCharCode(o);
    }
    i = o === -2, r.push(s);
  }
  return r.join("");
}
function oC(n) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      Qf([tC, ...(n || {}).extensions || []])
    ),
    content: i(wk),
    defined: [],
    document: i(Sk),
    flow: i(_w),
    lazy: {},
    string: i(jw),
    text: i(Vw)
  };
  return r;
  function i(o) {
    return s;
    function s(l) {
      return nC(r, o, l);
    }
  }
}
function sC(n) {
  for (; !rp(n); )
    ;
  return n;
}
const Vd = /[\0\t\n\r]/g;
function lC() {
  let n = 1, e = "", t = !0, r;
  return i;
  function i(o, s, l) {
    const a = [];
    let c, u, d, h, f;
    for (o = e + (typeof o == "string" ? o.toString() : new TextDecoder(s || void 0).decode(o)), d = 0, e = "", t && (o.charCodeAt(0) === 65279 && d++, t = void 0); d < o.length; ) {
      if (Vd.lastIndex = d, c = Vd.exec(o), h = c && c.index !== void 0 ? c.index : o.length, f = o.charCodeAt(h), !c) {
        e = o.slice(d);
        break;
      }
      if (f === 10 && d === h && r)
        a.push(-3), r = void 0;
      else
        switch (r && (a.push(-5), r = void 0), d < h && (a.push(o.slice(d, h)), n += h - d), f) {
          case 0: {
            a.push(65533), n++;
            break;
          }
          case 9: {
            for (u = Math.ceil(n / 4) * 4, a.push(-2); n++ < u; ) a.push(-1);
            break;
          }
          case 10: {
            a.push(-4), n = 1;
            break;
          }
          default:
            r = !0, n = 1;
        }
      d = h + 1;
    }
    return l && (r && a.push(-5), e && a.push(e), a.push(null)), a;
  }
}
const aC = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function cp(n) {
  return n.replace(aC, cC);
}
function cC(n, e, t) {
  if (e)
    return e;
  if (t.charCodeAt(0) === 35) {
    const i = t.charCodeAt(1), o = i === 120 || i === 88;
    return Zf(t.slice(o ? 2 : 1), o ? 16 : 10);
  }
  return Dc(t) || n;
}
const up = {}.hasOwnProperty;
function uC(n, e, t) {
  return typeof e != "string" && (t = e, e = void 0), dC(t)(sC(oC(t).document().write(lC()(n, e, !0))));
}
function dC(n) {
  const e = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: o(yd),
      autolinkProtocol: H,
      autolinkEmail: H,
      atxHeading: o(pd),
      blockQuote: o(yr),
      characterEscape: H,
      characterReference: H,
      codeFenced: o(qo),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: o(qo, s),
      codeText: o(ub, s),
      codeTextData: H,
      data: H,
      codeFlowValue: H,
      definition: o(db),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: o(hb),
      hardBreakEscape: o(md),
      hardBreakTrailing: o(md),
      htmlFlow: o(gd, s),
      htmlFlowData: H,
      htmlText: o(gd, s),
      htmlTextData: H,
      image: o(fb),
      label: s,
      link: o(yd),
      listItem: o(pb),
      listItemValue: h,
      listOrdered: o(bd, d),
      listUnordered: o(bd),
      paragraph: o(mb),
      reference: k,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: o(pd),
      strong: o(gb),
      thematicBreak: o(bb)
    },
    exit: {
      atxHeading: a(),
      atxHeadingSequence: D,
      autolink: a(),
      autolinkEmail: gr,
      autolinkProtocol: un,
      blockQuote: a(),
      characterEscapeValue: S,
      characterReferenceMarkerHexadecimal: Bn,
      characterReferenceMarkerNumeric: Bn,
      characterReferenceValue: Ee,
      characterReference: mi,
      codeFenced: a(y),
      codeFencedFence: m,
      codeFencedFenceInfo: f,
      codeFencedFenceMeta: p,
      codeFlowValue: S,
      codeIndented: a(g),
      codeText: a(te),
      codeTextData: S,
      data: S,
      definition: a(),
      definitionDestinationString: L,
      definitionLabelString: C,
      definitionTitleString: x,
      emphasis: a(),
      hardBreakEscape: a(z),
      hardBreakTrailing: a(z),
      htmlFlow: a(ie),
      htmlFlowData: S,
      htmlText: a(de),
      htmlTextData: S,
      image: a(ve),
      label: $t,
      labelText: bt,
      lineEnding: $,
      link: a(Ie),
      listItem: a(),
      listOrdered: a(),
      listUnordered: a(),
      paragraph: a(),
      referenceString: wt,
      resourceDestinationString: b,
      resourceTitleString: kt,
      resource: zt,
      setextHeading: a(B),
      setextHeadingLineSequence: A,
      setextHeadingText: w,
      strong: a(),
      thematicBreak: a()
    }
  };
  dp(e, (n || {}).mdastExtensions || []);
  const t = {};
  return r;
  function r(M) {
    let O = {
      type: "root",
      children: []
    };
    const V = {
      stack: [O],
      tokenStack: [],
      config: e,
      enter: l,
      exit: c,
      buffer: s,
      resume: u,
      data: t
    }, Q = [];
    let oe = -1;
    for (; ++oe < M.length; )
      if (M[oe][1].type === "listOrdered" || M[oe][1].type === "listUnordered")
        if (M[oe][0] === "enter")
          Q.push(oe);
        else {
          const Ct = Q.pop();
          oe = i(M, Ct, oe);
        }
    for (oe = -1; ++oe < M.length; ) {
      const Ct = e[M[oe][0]];
      up.call(Ct, M[oe][1].type) && Ct[M[oe][1].type].call(Object.assign({
        sliceSerialize: M[oe][2].sliceSerialize
      }, V), M[oe][1]);
    }
    if (V.tokenStack.length > 0) {
      const Ct = V.tokenStack[V.tokenStack.length - 1];
      (Ct[1] || Ud).call(V, void 0, Ct[0]);
    }
    for (O.position = {
      start: dn(M.length > 0 ? M[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: dn(M.length > 0 ? M[M.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, oe = -1; ++oe < e.transforms.length; )
      O = e.transforms[oe](O) || O;
    return O;
  }
  function i(M, O, V) {
    let Q = O - 1, oe = -1, Ct = !1, $n, Ft, gi, yi;
    for (; ++Q <= V; ) {
      const Ge = M[Q];
      switch (Ge[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          Ge[0] === "enter" ? oe++ : oe--, yi = void 0;
          break;
        }
        case "lineEndingBlank": {
          Ge[0] === "enter" && ($n && !yi && !oe && !gi && (gi = Q), yi = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          yi = void 0;
      }
      if (!oe && Ge[0] === "enter" && Ge[1].type === "listItemPrefix" || oe === -1 && Ge[0] === "exit" && (Ge[1].type === "listUnordered" || Ge[1].type === "listOrdered")) {
        if ($n) {
          let br = Q;
          for (Ft = void 0; br--; ) {
            const _t = M[br];
            if (_t[1].type === "lineEnding" || _t[1].type === "lineEndingBlank") {
              if (_t[0] === "exit") continue;
              Ft && (M[Ft][1].type = "lineEndingBlank", Ct = !0), _t[1].type = "lineEnding", Ft = br;
            } else if (!(_t[1].type === "linePrefix" || _t[1].type === "blockQuotePrefix" || _t[1].type === "blockQuotePrefixWhitespace" || _t[1].type === "blockQuoteMarker" || _t[1].type === "listItemIndent")) break;
          }
          gi && (!Ft || gi < Ft) && ($n._spread = !0), $n.end = Object.assign({}, Ft ? M[Ft][1].start : Ge[1].end), M.splice(Ft || Q, 0, ["exit", $n, Ge[2]]), Q++, V++;
        }
        if (Ge[1].type === "listItemPrefix") {
          const br = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, Ge[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          $n = br, M.splice(Q, 0, ["enter", br, Ge[2]]), Q++, V++, gi = void 0, yi = !0;
        }
      }
    }
    return M[O][1]._spread = Ct, V;
  }
  function o(M, O) {
    return V;
    function V(Q) {
      l.call(this, M(Q), Q), O && O.call(this, Q);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function l(M, O, V) {
    this.stack[this.stack.length - 1].children.push(M), this.stack.push(M), this.tokenStack.push([O, V || void 0]), M.position = {
      start: dn(O.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function a(M) {
    return O;
    function O(V) {
      M && M.call(this, V), c.call(this, V);
    }
  }
  function c(M, O) {
    const V = this.stack.pop(), Q = this.tokenStack.pop();
    if (Q)
      Q[0].type !== M.type && (O ? O.call(this, M, Q[0]) : (Q[1] || Ud).call(this, M, Q[0]));
    else throw new Error("Cannot close `" + M.type + "` (" + Bi({
      start: M.start,
      end: M.end
    }) + "): it’s not open");
    V.position.end = dn(M.end);
  }
  function u() {
    return tl(this.stack.pop());
  }
  function d() {
    this.data.expectingFirstListItemValue = !0;
  }
  function h(M) {
    if (this.data.expectingFirstListItemValue) {
      const O = this.stack[this.stack.length - 2];
      O.start = Number.parseInt(this.sliceSerialize(M), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function f() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.lang = M;
  }
  function p() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.meta = M;
  }
  function m() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function y() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.value = M.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function g() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.value = M.replace(/(\r?\n|\r)$/g, "");
  }
  function C(M) {
    const O = this.resume(), V = this.stack[this.stack.length - 1];
    V.label = O, V.identifier = Et(this.sliceSerialize(M)).toLowerCase();
  }
  function x() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.title = M;
  }
  function L() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.url = M;
  }
  function D(M) {
    const O = this.stack[this.stack.length - 1];
    if (!O.depth) {
      const V = this.sliceSerialize(M).length;
      O.depth = V;
    }
  }
  function w() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function A(M) {
    const O = this.stack[this.stack.length - 1];
    O.depth = this.sliceSerialize(M).codePointAt(0) === 61 ? 1 : 2;
  }
  function B() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function H(M) {
    const V = this.stack[this.stack.length - 1].children;
    let Q = V[V.length - 1];
    (!Q || Q.type !== "text") && (Q = yb(), Q.position = {
      start: dn(M.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, V.push(Q)), this.stack.push(Q);
  }
  function S(M) {
    const O = this.stack.pop();
    O.value += this.sliceSerialize(M), O.position.end = dn(M.end);
  }
  function $(M) {
    const O = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const V = O.children[O.children.length - 1];
      V.position.end = dn(M.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && e.canContainEols.includes(O.type) && (H.call(this, M), S.call(this, M));
  }
  function z() {
    this.data.atHardBreak = !0;
  }
  function ie() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.value = M;
  }
  function de() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.value = M;
  }
  function te() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.value = M;
  }
  function Ie() {
    const M = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const O = this.data.referenceType || "shortcut";
      M.type += "Reference", M.referenceType = O, delete M.url, delete M.title;
    } else
      delete M.identifier, delete M.label;
    this.data.referenceType = void 0;
  }
  function ve() {
    const M = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const O = this.data.referenceType || "shortcut";
      M.type += "Reference", M.referenceType = O, delete M.url, delete M.title;
    } else
      delete M.identifier, delete M.label;
    this.data.referenceType = void 0;
  }
  function bt(M) {
    const O = this.sliceSerialize(M), V = this.stack[this.stack.length - 2];
    V.label = cp(O), V.identifier = Et(O).toLowerCase();
  }
  function $t() {
    const M = this.stack[this.stack.length - 1], O = this.resume(), V = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, V.type === "link") {
      const Q = M.children;
      V.children = Q;
    } else
      V.alt = O;
  }
  function b() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.url = M;
  }
  function kt() {
    const M = this.resume(), O = this.stack[this.stack.length - 1];
    O.title = M;
  }
  function zt() {
    this.data.inReference = void 0;
  }
  function k() {
    this.data.referenceType = "collapsed";
  }
  function wt(M) {
    const O = this.resume(), V = this.stack[this.stack.length - 1];
    V.label = O, V.identifier = Et(this.sliceSerialize(M)).toLowerCase(), this.data.referenceType = "full";
  }
  function Bn(M) {
    this.data.characterReferenceType = M.type;
  }
  function Ee(M) {
    const O = this.sliceSerialize(M), V = this.data.characterReferenceType;
    let Q;
    V ? (Q = Zf(O, V === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : Q = Dc(O);
    const oe = this.stack[this.stack.length - 1];
    oe.value += Q;
  }
  function mi(M) {
    const O = this.stack.pop();
    O.position.end = dn(M.end);
  }
  function un(M) {
    S.call(this, M);
    const O = this.stack[this.stack.length - 1];
    O.url = this.sliceSerialize(M);
  }
  function gr(M) {
    S.call(this, M);
    const O = this.stack[this.stack.length - 1];
    O.url = "mailto:" + this.sliceSerialize(M);
  }
  function yr() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function qo() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function ub() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function db() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function hb() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function pd() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function md() {
    return {
      type: "break"
    };
  }
  function gd() {
    return {
      type: "html",
      value: ""
    };
  }
  function fb() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function yd() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function bd(M) {
    return {
      type: "list",
      ordered: M.type === "listOrdered",
      start: null,
      spread: M._spread,
      children: []
    };
  }
  function pb(M) {
    return {
      type: "listItem",
      spread: M._spread,
      checked: null,
      children: []
    };
  }
  function mb() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function gb() {
    return {
      type: "strong",
      children: []
    };
  }
  function yb() {
    return {
      type: "text",
      value: ""
    };
  }
  function bb() {
    return {
      type: "thematicBreak"
    };
  }
}
function dn(n) {
  return {
    line: n.line,
    column: n.column,
    offset: n.offset
  };
}
function dp(n, e) {
  let t = -1;
  for (; ++t < e.length; ) {
    const r = e[t];
    Array.isArray(r) ? dp(n, r) : hC(n, r);
  }
}
function hC(n, e) {
  let t;
  for (t in e)
    if (up.call(e, t))
      switch (t) {
        case "canContainEols": {
          const r = e[t];
          r && n[t].push(...r);
          break;
        }
        case "transforms": {
          const r = e[t];
          r && n[t].push(...r);
          break;
        }
        case "enter":
        case "exit": {
          const r = e[t];
          r && Object.assign(n[t], r);
          break;
        }
      }
}
function Ud(n, e) {
  throw n ? new Error("Cannot close `" + n.type + "` (" + Bi({
    start: n.start,
    end: n.end
  }) + "): a different token (`" + e.type + "`, " + Bi({
    start: e.start,
    end: e.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + e.type + "`, " + Bi({
    start: e.start,
    end: e.end
  }) + ") is still open");
}
function Qi(n) {
  const e = this;
  e.parser = t;
  function t(r) {
    return uC(r, {
      ...e.data("settings"),
      ...n,
      // Note: these options are not in the readme.
      // The goal is for them to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("micromarkExtensions") || [],
      mdastExtensions: e.data("fromMarkdownExtensions") || []
    });
  }
}
function Ds(n, e) {
  const t = String(n);
  if (typeof e != "string")
    throw new TypeError("Expected character");
  let r = 0, i = t.indexOf(e);
  for (; i !== -1; )
    r++, i = t.indexOf(e, i + e.length);
  return r;
}
function fC(n) {
  if (typeof n != "string")
    throw new TypeError("Expected a string");
  return n.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
const il = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(n) {
    if (n == null)
      return yC;
    if (typeof n == "function")
      return ol(n);
    if (typeof n == "object")
      return Array.isArray(n) ? pC(n) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        mC(
          /** @type {Props} */
          n
        )
      );
    if (typeof n == "string")
      return gC(n);
    throw new Error("Expected function, string, or object as test");
  })
);
function pC(n) {
  const e = [];
  let t = -1;
  for (; ++t < n.length; )
    e[t] = il(n[t]);
  return ol(r);
  function r(...i) {
    let o = -1;
    for (; ++o < e.length; )
      if (e[o].apply(this, i)) return !0;
    return !1;
  }
}
function mC(n) {
  const e = (
    /** @type {Record<string, unknown>} */
    n
  );
  return ol(t);
  function t(r) {
    const i = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      r
    );
    let o;
    for (o in n)
      if (i[o] !== e[o]) return !1;
    return !0;
  }
}
function gC(n) {
  return ol(e);
  function e(t) {
    return t && t.type === n;
  }
}
function ol(n) {
  return e;
  function e(t, r, i) {
    return !!(bC(t) && n.call(
      this,
      t,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function yC() {
  return !0;
}
function bC(n) {
  return n !== null && typeof n == "object" && "type" in n;
}
const hp = [], kC = !0, Ha = !1, qa = "skip";
function Pc(n, e, t, r) {
  let i;
  typeof e == "function" && typeof t != "function" ? (r = t, t = e) : i = e;
  const o = il(i), s = r ? -1 : 1;
  l(n, void 0, [])();
  function l(a, c, u) {
    const d = (
      /** @type {Record<string, unknown>} */
      a && typeof a == "object" ? a : {}
    );
    if (typeof d.type == "string") {
      const f = (
        // `hast`
        typeof d.tagName == "string" ? d.tagName : (
          // `xast`
          typeof d.name == "string" ? d.name : void 0
        )
      );
      Object.defineProperty(h, "name", {
        value: "node (" + (a.type + (f ? "<" + f + ">" : "")) + ")"
      });
    }
    return h;
    function h() {
      let f = hp, p, m, y;
      if ((!e || o(a, c, u[u.length - 1] || void 0)) && (f = wC(t(a, u)), f[0] === Ha))
        return f;
      if ("children" in a && a.children) {
        const g = (
          /** @type {UnistParent} */
          a
        );
        if (g.children && f[0] !== qa)
          for (m = (r ? g.children.length : -1) + s, y = u.concat(g); m > -1 && m < g.children.length; ) {
            const C = g.children[m];
            if (p = l(C, m, y)(), p[0] === Ha)
              return p;
            m = typeof p[1] == "number" ? p[1] : m + s;
          }
      }
      return f;
    }
  }
}
function wC(n) {
  return Array.isArray(n) ? n : typeof n == "number" ? [kC, n] : n == null ? hp : [n];
}
function CC(n, e, t) {
  const i = il((t || {}).ignore || []), o = SC(e);
  let s = -1;
  for (; ++s < o.length; )
    Pc(n, "text", l);
  function l(c, u) {
    let d = -1, h;
    for (; ++d < u.length; ) {
      const f = u[d], p = h ? h.children : void 0;
      if (i(
        f,
        p ? p.indexOf(f) : void 0,
        h
      ))
        return;
      h = f;
    }
    if (h)
      return a(c, u);
  }
  function a(c, u) {
    const d = u[u.length - 1], h = o[s][0], f = o[s][1];
    let p = 0;
    const y = d.children.indexOf(c);
    let g = !1, C = [];
    h.lastIndex = 0;
    let x = h.exec(c.value);
    for (; x; ) {
      const L = x.index, D = {
        index: x.index,
        input: x.input,
        stack: [...u, c]
      };
      let w = f(...x, D);
      if (typeof w == "string" && (w = w.length > 0 ? { type: "text", value: w } : void 0), w === !1 ? h.lastIndex = L + 1 : (p !== L && C.push({
        type: "text",
        value: c.value.slice(p, L)
      }), Array.isArray(w) ? C.push(...w) : w && C.push(w), p = L + x[0].length, g = !0), !h.global)
        break;
      x = h.exec(c.value);
    }
    return g ? (p < c.value.length && C.push({ type: "text", value: c.value.slice(p) }), d.children.splice(y, 1, ...C)) : C = [c], y + C.length;
  }
}
function SC(n) {
  const e = [];
  if (!Array.isArray(n))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const t = !n[0] || Array.isArray(n[0]) ? n : [n];
  let r = -1;
  for (; ++r < t.length; ) {
    const i = t[r];
    e.push([xC(i[0]), vC(i[1])]);
  }
  return e;
}
function xC(n) {
  return typeof n == "string" ? new RegExp(fC(n), "g") : n;
}
function vC(n) {
  return typeof n == "function" ? n : function() {
    return n;
  };
}
const jl = "phrasing", Vl = ["autolink", "link", "image", "label"];
function EC() {
  return {
    transforms: [RC],
    enter: {
      literalAutolink: TC,
      literalAutolinkEmail: Ul,
      literalAutolinkHttp: Ul,
      literalAutolinkWww: Ul
    },
    exit: {
      literalAutolink: OC,
      literalAutolinkEmail: AC,
      literalAutolinkHttp: NC,
      literalAutolinkWww: IC
    }
  };
}
function MC() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: jl,
        notInConstruct: Vl
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: jl,
        notInConstruct: Vl
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: jl,
        notInConstruct: Vl
      }
    ]
  };
}
function TC(n) {
  this.enter({ type: "link", title: null, url: "", children: [] }, n);
}
function Ul(n) {
  this.config.enter.autolinkProtocol.call(this, n);
}
function NC(n) {
  this.config.exit.autolinkProtocol.call(this, n);
}
function IC(n) {
  this.config.exit.data.call(this, n);
  const e = this.stack[this.stack.length - 1];
  e.type, e.url = "http://" + this.sliceSerialize(n);
}
function AC(n) {
  this.config.exit.autolinkEmail.call(this, n);
}
function OC(n) {
  this.exit(n);
}
function RC(n) {
  CC(
    n,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, DC],
      [/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu, LC]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function DC(n, e, t, r, i) {
  let o = "";
  if (!fp(i) || (/^w/i.test(e) && (t = e + t, e = "", o = "http://"), !PC(t)))
    return !1;
  const s = BC(t + r);
  if (!s[0]) return !1;
  const l = {
    type: "link",
    title: null,
    url: o + e + s[0],
    children: [{ type: "text", value: e + s[0] }]
  };
  return s[1] ? [l, { type: "text", value: s[1] }] : l;
}
function LC(n, e, t, r) {
  return (
    // Not an expected previous character.
    !fp(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(t) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + e + "@" + t,
      children: [{ type: "text", value: e + "@" + t }]
    }
  );
}
function PC(n) {
  const e = n.split(".");
  return !(e.length < 2 || e[e.length - 1] && (/_/.test(e[e.length - 1]) || !/[a-zA-Z\d]/.test(e[e.length - 1])) || e[e.length - 2] && (/_/.test(e[e.length - 2]) || !/[a-zA-Z\d]/.test(e[e.length - 2])));
}
function BC(n) {
  const e = /[!"&'),.:;<>?\]}]+$/.exec(n);
  if (!e)
    return [n, void 0];
  n = n.slice(0, e.index);
  let t = e[0], r = t.indexOf(")");
  const i = Ds(n, "(");
  let o = Ds(n, ")");
  for (; r !== -1 && i > o; )
    n += t.slice(0, r + 1), t = t.slice(r + 1), r = t.indexOf(")"), o++;
  return [n, t];
}
function fp(n, e) {
  const t = n.input.charCodeAt(n.index - 1);
  return (n.index === 0 || sr(t) || nl(t)) && // If it’s an email, the previous character should not be a slash.
  (!e || t !== 47);
}
pp.peek = UC;
function $C() {
  this.buffer();
}
function zC(n) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, n);
}
function FC() {
  this.buffer();
}
function _C(n) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    n
  );
}
function HC(n) {
  const e = this.resume(), t = this.stack[this.stack.length - 1];
  t.type, t.identifier = Et(
    this.sliceSerialize(n)
  ).toLowerCase(), t.label = e;
}
function qC(n) {
  this.exit(n);
}
function jC(n) {
  const e = this.resume(), t = this.stack[this.stack.length - 1];
  t.type, t.identifier = Et(
    this.sliceSerialize(n)
  ).toLowerCase(), t.label = e;
}
function VC(n) {
  this.exit(n);
}
function UC() {
  return "[";
}
function pp(n, e, t, r) {
  const i = t.createTracker(r);
  let o = i.move("[^");
  const s = t.enter("footnoteReference"), l = t.enter("reference");
  return o += i.move(
    t.safe(t.associationId(n), { after: "]", before: o })
  ), l(), s(), o += i.move("]"), o;
}
function WC() {
  return {
    enter: {
      gfmFootnoteCallString: $C,
      gfmFootnoteCall: zC,
      gfmFootnoteDefinitionLabelString: FC,
      gfmFootnoteDefinition: _C
    },
    exit: {
      gfmFootnoteCallString: HC,
      gfmFootnoteCall: qC,
      gfmFootnoteDefinitionLabelString: jC,
      gfmFootnoteDefinition: VC
    }
  };
}
function KC(n) {
  let e = !1;
  return n && n.firstLineBlank && (e = !0), {
    handlers: { footnoteDefinition: t, footnoteReference: pp },
    // This is on by default already.
    unsafe: [{ character: "[", inConstruct: ["label", "phrasing", "reference"] }]
  };
  function t(r, i, o, s) {
    const l = o.createTracker(s);
    let a = l.move("[^");
    const c = o.enter("footnoteDefinition"), u = o.enter("label");
    return a += l.move(
      o.safe(o.associationId(r), { before: a, after: "]" })
    ), u(), a += l.move("]:"), r.children && r.children.length > 0 && (l.shift(4), a += l.move(
      (e ? `
` : " ") + o.indentLines(
        o.containerFlow(r, l.current()),
        e ? mp : JC
      )
    )), c(), a;
  }
}
function JC(n, e, t) {
  return e === 0 ? n : mp(n, e, t);
}
function mp(n, e, t) {
  return (t ? "" : "    ") + n;
}
const GC = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
gp.peek = eS;
function YC() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: QC },
    exit: { strikethrough: ZC }
  };
}
function XC() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: GC
      }
    ],
    handlers: { delete: gp }
  };
}
function QC(n) {
  this.enter({ type: "delete", children: [] }, n);
}
function ZC(n) {
  this.exit(n);
}
function gp(n, e, t, r) {
  const i = t.createTracker(r), o = t.enter("strikethrough");
  let s = i.move("~~");
  return s += t.containerPhrasing(n, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), o(), s;
}
function eS() {
  return "~";
}
function tS(n) {
  return n.length;
}
function nS(n, e) {
  const t = e || {}, r = (t.align || []).concat(), i = t.stringLength || tS, o = [], s = [], l = [], a = [];
  let c = 0, u = -1;
  for (; ++u < n.length; ) {
    const m = [], y = [];
    let g = -1;
    for (n[u].length > c && (c = n[u].length); ++g < n[u].length; ) {
      const C = rS(n[u][g]);
      if (t.alignDelimiters !== !1) {
        const x = i(C);
        y[g] = x, (a[g] === void 0 || x > a[g]) && (a[g] = x);
      }
      m.push(C);
    }
    s[u] = m, l[u] = y;
  }
  let d = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++d < c; )
      o[d] = Wd(r[d]);
  else {
    const m = Wd(r);
    for (; ++d < c; )
      o[d] = m;
  }
  d = -1;
  const h = [], f = [];
  for (; ++d < c; ) {
    const m = o[d];
    let y = "", g = "";
    m === 99 ? (y = ":", g = ":") : m === 108 ? y = ":" : m === 114 && (g = ":");
    let C = t.alignDelimiters === !1 ? 1 : Math.max(
      1,
      a[d] - y.length - g.length
    );
    const x = y + "-".repeat(C) + g;
    t.alignDelimiters !== !1 && (C = y.length + C + g.length, C > a[d] && (a[d] = C), f[d] = C), h[d] = x;
  }
  s.splice(1, 0, h), l.splice(1, 0, f), u = -1;
  const p = [];
  for (; ++u < s.length; ) {
    const m = s[u], y = l[u];
    d = -1;
    const g = [];
    for (; ++d < c; ) {
      const C = m[d] || "";
      let x = "", L = "";
      if (t.alignDelimiters !== !1) {
        const D = a[d] - (y[d] || 0), w = o[d];
        w === 114 ? x = " ".repeat(D) : w === 99 ? D % 2 ? (x = " ".repeat(D / 2 + 0.5), L = " ".repeat(D / 2 - 0.5)) : (x = " ".repeat(D / 2), L = x) : L = " ".repeat(D);
      }
      t.delimiterStart !== !1 && !d && g.push("|"), t.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(t.alignDelimiters === !1 && C === "") && (t.delimiterStart !== !1 || d) && g.push(" "), t.alignDelimiters !== !1 && g.push(x), g.push(C), t.alignDelimiters !== !1 && g.push(L), t.padding !== !1 && g.push(" "), (t.delimiterEnd !== !1 || d !== c - 1) && g.push("|");
    }
    p.push(
      t.delimiterEnd === !1 ? g.join("").replace(/ +$/, "") : g.join("")
    );
  }
  return p.join(`
`);
}
function rS(n) {
  return n == null ? "" : String(n);
}
function Wd(n) {
  const e = typeof n == "string" ? n.codePointAt(0) : 0;
  return e === 67 || e === 99 ? 99 : e === 76 || e === 108 ? 108 : e === 82 || e === 114 ? 114 : 0;
}
const Kd = {}.hasOwnProperty;
function yp(n, e) {
  const t = e || {};
  function r(i, ...o) {
    let s = r.invalid;
    const l = r.handlers;
    if (i && Kd.call(i, n)) {
      const a = String(i[n]);
      s = Kd.call(l, a) ? l[a] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...o);
  }
  return r.handlers = t.handlers || {}, r.invalid = t.invalid, r.unknown = t.unknown, r;
}
const iS = {}.hasOwnProperty;
function bp(n, e) {
  let t = -1, r;
  if (e.extensions)
    for (; ++t < e.extensions.length; )
      bp(n, e.extensions[t]);
  for (r in e)
    if (iS.call(e, r))
      switch (r) {
        case "extensions":
          break;
        /* c8 ignore next 4 */
        case "unsafe": {
          Jd(n[r], e[r]);
          break;
        }
        case "join": {
          Jd(n[r], e[r]);
          break;
        }
        case "handlers": {
          oS(n[r], e[r]);
          break;
        }
        default:
          n.options[r] = e[r];
      }
  return n;
}
function Jd(n, e) {
  e && n.push(...e);
}
function oS(n, e) {
  e && Object.assign(n, e);
}
function sS(n, e, t, r) {
  const i = t.enter("blockquote"), o = t.createTracker(r);
  o.move("> "), o.shift(2);
  const s = t.indentLines(
    t.containerFlow(n, o.current()),
    lS
  );
  return i(), s;
}
function lS(n, e, t) {
  return ">" + (t ? "" : " ") + n;
}
function kp(n, e) {
  return Gd(n, e.inConstruct, !0) && !Gd(n, e.notInConstruct, !1);
}
function Gd(n, e, t) {
  if (typeof e == "string" && (e = [e]), !e || e.length === 0)
    return t;
  let r = -1;
  for (; ++r < e.length; )
    if (n.includes(e[r]))
      return !0;
  return !1;
}
function Yd(n, e, t, r) {
  let i = -1;
  for (; ++i < t.unsafe.length; )
    if (t.unsafe[i].character === `
` && kp(t.stack, t.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function aS(n, e) {
  const t = String(n);
  let r = t.indexOf(e), i = r, o = 0, s = 0;
  if (typeof e != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++o > s && (s = o) : o = 1, i = r + e.length, r = t.indexOf(e, i);
  return s;
}
function ja(n, e) {
  return !!(e.options.fences === !1 && n.value && // If there’s no info…
  !n.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(n.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(n.value));
}
function cS(n) {
  const e = n.options.fence || "`";
  if (e !== "`" && e !== "~")
    throw new Error(
      "Cannot serialize code with `" + e + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return e;
}
function uS(n, e, t, r) {
  const i = cS(t), o = n.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (ja(n, t)) {
    const d = t.enter("codeIndented"), h = t.indentLines(o, dS);
    return d(), h;
  }
  const l = t.createTracker(r), a = i.repeat(Math.max(aS(o, i) + 1, 3)), c = t.enter("codeFenced");
  let u = l.move(a);
  if (n.lang) {
    const d = t.enter(`codeFencedLang${s}`);
    u += l.move(
      t.safe(n.lang, {
        before: u,
        after: " ",
        encode: ["`"],
        ...l.current()
      })
    ), d();
  }
  if (n.lang && n.meta) {
    const d = t.enter(`codeFencedMeta${s}`);
    u += l.move(" "), u += l.move(
      t.safe(n.meta, {
        before: u,
        after: `
`,
        encode: ["`"],
        ...l.current()
      })
    ), d();
  }
  return u += l.move(`
`), o && (u += l.move(o + `
`)), u += l.move(a), c(), u;
}
function dS(n, e, t) {
  return (t ? "" : "    ") + n;
}
function Bc(n) {
  const e = n.options.quote || '"';
  if (e !== '"' && e !== "'")
    throw new Error(
      "Cannot serialize title with `" + e + "` for `options.quote`, expected `\"`, or `'`"
    );
  return e;
}
function hS(n, e, t, r) {
  const i = Bc(t), o = i === '"' ? "Quote" : "Apostrophe", s = t.enter("definition");
  let l = t.enter("label");
  const a = t.createTracker(r);
  let c = a.move("[");
  return c += a.move(
    t.safe(t.associationId(n), {
      before: c,
      after: "]",
      ...a.current()
    })
  ), c += a.move("]: "), l(), // If there’s no url, or…
  !n.url || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(n.url) ? (l = t.enter("destinationLiteral"), c += a.move("<"), c += a.move(
    t.safe(n.url, { before: c, after: ">", ...a.current() })
  ), c += a.move(">")) : (l = t.enter("destinationRaw"), c += a.move(
    t.safe(n.url, {
      before: c,
      after: n.title ? " " : `
`,
      ...a.current()
    })
  )), l(), n.title && (l = t.enter(`title${o}`), c += a.move(" " + i), c += a.move(
    t.safe(n.title, {
      before: c,
      after: i,
      ...a.current()
    })
  ), c += a.move(i), l()), s(), c;
}
function fS(n) {
  const e = n.options.emphasis || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + e + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return e;
}
function Nn(n) {
  return "&#x" + n.toString(16).toUpperCase() + ";";
}
function Ls(n, e, t) {
  const r = Xr(n), i = Xr(e);
  return r === void 0 ? i === void 0 ? (
    // Letter inside:
    // we have to encode *both* letters for `_` as it is looser.
    // it already forms for `*` (and GFMs `~`).
    t === "_" ? { inside: !0, outside: !0 } : { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode both (letter, whitespace).
    { inside: !0, outside: !0 }
  ) : (
    // Punctuation inside: encode outer (letter)
    { inside: !1, outside: !0 }
  ) : r === 1 ? i === void 0 ? (
    // Letter inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode both (whitespace).
    { inside: !0, outside: !0 }
  ) : (
    // Punctuation inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === void 0 ? (
    // Letter inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode inner (whitespace).
    { inside: !0, outside: !1 }
  ) : (
    // Punctuation inside: already forms.
    { inside: !1, outside: !1 }
  );
}
wp.peek = pS;
function wp(n, e, t, r) {
  const i = fS(t), o = t.enter("emphasis"), s = t.createTracker(r), l = s.move(i);
  let a = s.move(
    t.containerPhrasing(n, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const c = a.charCodeAt(0), u = Ls(
    r.before.charCodeAt(r.before.length - 1),
    c,
    i
  );
  u.inside && (a = Nn(c) + a.slice(1));
  const d = a.charCodeAt(a.length - 1), h = Ls(r.after.charCodeAt(0), d, i);
  h.inside && (a = a.slice(0, -1) + Nn(d));
  const f = s.move(i);
  return o(), t.attentionEncodeSurroundingInfo = {
    after: h.outside,
    before: u.outside
  }, l + a + f;
}
function pS(n, e, t) {
  return t.options.emphasis || "*";
}
function rn(n, e, t, r) {
  let i, o, s;
  typeof e == "function" && typeof t != "function" ? (o = void 0, s = e, i = t) : (o = e, s = t, i = r), Pc(n, o, l, i);
  function l(a, c) {
    const u = c[c.length - 1], d = u ? u.children.indexOf(a) : void 0;
    return s(a, d, u);
  }
}
function Cp(n, e) {
  let t = !1;
  return rn(n, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return t = !0, Ha;
  }), !!((!n.depth || n.depth < 3) && tl(n) && (e.options.setext || t));
}
function mS(n, e, t, r) {
  const i = Math.max(Math.min(6, n.depth || 1), 1), o = t.createTracker(r);
  if (Cp(n, t)) {
    const u = t.enter("headingSetext"), d = t.enter("phrasing"), h = t.containerPhrasing(n, {
      ...o.current(),
      before: `
`,
      after: `
`
    });
    return d(), u(), h + `
` + (i === 1 ? "=" : "-").repeat(
      // The whole size…
      h.length - // Minus the position of the character after the last EOL (or
      // 0 if there is none)…
      (Math.max(h.lastIndexOf("\r"), h.lastIndexOf(`
`)) + 1)
    );
  }
  const s = "#".repeat(i), l = t.enter("headingAtx"), a = t.enter("phrasing");
  o.move(s + " ");
  let c = t.containerPhrasing(n, {
    before: "# ",
    after: `
`,
    ...o.current()
  });
  return /^[\t ]/.test(c) && (c = Nn(c.charCodeAt(0)) + c.slice(1)), c = c ? s + " " + c : s, t.options.closeAtx && (c += " " + s), a(), l(), c;
}
Sp.peek = gS;
function Sp(n) {
  return n.value || "";
}
function gS() {
  return "<";
}
xp.peek = yS;
function xp(n, e, t, r) {
  const i = Bc(t), o = i === '"' ? "Quote" : "Apostrophe", s = t.enter("image");
  let l = t.enter("label");
  const a = t.createTracker(r);
  let c = a.move("![");
  return c += a.move(
    t.safe(n.alt, { before: c, after: "]", ...a.current() })
  ), c += a.move("]("), l(), // If there’s no url but there is a title…
  !n.url && n.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(n.url) ? (l = t.enter("destinationLiteral"), c += a.move("<"), c += a.move(
    t.safe(n.url, { before: c, after: ">", ...a.current() })
  ), c += a.move(">")) : (l = t.enter("destinationRaw"), c += a.move(
    t.safe(n.url, {
      before: c,
      after: n.title ? " " : ")",
      ...a.current()
    })
  )), l(), n.title && (l = t.enter(`title${o}`), c += a.move(" " + i), c += a.move(
    t.safe(n.title, {
      before: c,
      after: i,
      ...a.current()
    })
  ), c += a.move(i), l()), c += a.move(")"), s(), c;
}
function yS() {
  return "!";
}
vp.peek = bS;
function vp(n, e, t, r) {
  const i = n.referenceType, o = t.enter("imageReference");
  let s = t.enter("label");
  const l = t.createTracker(r);
  let a = l.move("![");
  const c = t.safe(n.alt, {
    before: a,
    after: "]",
    ...l.current()
  });
  a += l.move(c + "]["), s();
  const u = t.stack;
  t.stack = [], s = t.enter("reference");
  const d = t.safe(t.associationId(n), {
    before: a,
    after: "]",
    ...l.current()
  });
  return s(), t.stack = u, o(), i === "full" || !c || c !== d ? a += l.move(d + "]") : i === "shortcut" ? a = a.slice(0, -1) : a += l.move("]"), a;
}
function bS() {
  return "!";
}
Ep.peek = kS;
function Ep(n, e, t) {
  let r = n.value || "", i = "`", o = -1;
  for (; new RegExp("(^|[^`])" + i + "([^`]|$)").test(r); )
    i += "`";
  for (/[^ \r\n]/.test(r) && (/^[ \r\n]/.test(r) && /[ \r\n]$/.test(r) || /^`|`$/.test(r)) && (r = " " + r + " "); ++o < t.unsafe.length; ) {
    const s = t.unsafe[o], l = t.compilePattern(s);
    let a;
    if (s.atBreak)
      for (; a = l.exec(r); ) {
        let c = a.index;
        r.charCodeAt(c) === 10 && r.charCodeAt(c - 1) === 13 && c--, r = r.slice(0, c) + " " + r.slice(a.index + 1);
      }
  }
  return i + r + i;
}
function kS() {
  return "`";
}
function Mp(n, e) {
  const t = tl(n);
  return !!(!e.options.resourceLink && // If there’s a url…
  n.url && // And there’s a no title…
  !n.title && // And the content of `node` is a single text node…
  n.children && n.children.length === 1 && n.children[0].type === "text" && // And if the url is the same as the content…
  (t === n.url || "mailto:" + t === n.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(n.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(n.url));
}
Tp.peek = wS;
function Tp(n, e, t, r) {
  const i = Bc(t), o = i === '"' ? "Quote" : "Apostrophe", s = t.createTracker(r);
  let l, a;
  if (Mp(n, t)) {
    const u = t.stack;
    t.stack = [], l = t.enter("autolink");
    let d = s.move("<");
    return d += s.move(
      t.containerPhrasing(n, {
        before: d,
        after: ">",
        ...s.current()
      })
    ), d += s.move(">"), l(), t.stack = u, d;
  }
  l = t.enter("link"), a = t.enter("label");
  let c = s.move("[");
  return c += s.move(
    t.containerPhrasing(n, {
      before: c,
      after: "](",
      ...s.current()
    })
  ), c += s.move("]("), a(), // If there’s no url but there is a title…
  !n.url && n.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(n.url) ? (a = t.enter("destinationLiteral"), c += s.move("<"), c += s.move(
    t.safe(n.url, { before: c, after: ">", ...s.current() })
  ), c += s.move(">")) : (a = t.enter("destinationRaw"), c += s.move(
    t.safe(n.url, {
      before: c,
      after: n.title ? " " : ")",
      ...s.current()
    })
  )), a(), n.title && (a = t.enter(`title${o}`), c += s.move(" " + i), c += s.move(
    t.safe(n.title, {
      before: c,
      after: i,
      ...s.current()
    })
  ), c += s.move(i), a()), c += s.move(")"), l(), c;
}
function wS(n, e, t) {
  return Mp(n, t) ? "<" : "[";
}
Np.peek = CS;
function Np(n, e, t, r) {
  const i = n.referenceType, o = t.enter("linkReference");
  let s = t.enter("label");
  const l = t.createTracker(r);
  let a = l.move("[");
  const c = t.containerPhrasing(n, {
    before: a,
    after: "]",
    ...l.current()
  });
  a += l.move(c + "]["), s();
  const u = t.stack;
  t.stack = [], s = t.enter("reference");
  const d = t.safe(t.associationId(n), {
    before: a,
    after: "]",
    ...l.current()
  });
  return s(), t.stack = u, o(), i === "full" || !c || c !== d ? a += l.move(d + "]") : i === "shortcut" ? a = a.slice(0, -1) : a += l.move("]"), a;
}
function CS() {
  return "[";
}
function $c(n) {
  const e = n.options.bullet || "*";
  if (e !== "*" && e !== "+" && e !== "-")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return e;
}
function SS(n) {
  const e = $c(n), t = n.options.bulletOther;
  if (!t)
    return e === "*" ? "-" : "*";
  if (t !== "*" && t !== "+" && t !== "-")
    throw new Error(
      "Cannot serialize items with `" + t + "` for `options.bulletOther`, expected `*`, `+`, or `-`"
    );
  if (t === e)
    throw new Error(
      "Expected `bullet` (`" + e + "`) and `bulletOther` (`" + t + "`) to be different"
    );
  return t;
}
function xS(n) {
  const e = n.options.bulletOrdered || ".";
  if (e !== "." && e !== ")")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return e;
}
function Ip(n) {
  const e = n.options.rule || "*";
  if (e !== "*" && e !== "-" && e !== "_")
    throw new Error(
      "Cannot serialize rules with `" + e + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return e;
}
function vS(n, e, t, r) {
  const i = t.enter("list"), o = t.bulletCurrent;
  let s = n.ordered ? xS(t) : $c(t);
  const l = n.ordered ? s === "." ? ")" : "." : SS(t);
  let a = e && t.bulletLastUsed ? s === t.bulletLastUsed : !1;
  if (!n.ordered) {
    const u = n.children ? n.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      u && (!u.children || !u.children[0]) && // Directly in two other list items:
      t.stack[t.stack.length - 1] === "list" && t.stack[t.stack.length - 2] === "listItem" && t.stack[t.stack.length - 3] === "list" && t.stack[t.stack.length - 4] === "listItem" && // That are each the first child.
      t.indexStack[t.indexStack.length - 1] === 0 && t.indexStack[t.indexStack.length - 2] === 0 && t.indexStack[t.indexStack.length - 3] === 0 && (a = !0), Ip(t) === s && u
    ) {
      let d = -1;
      for (; ++d < n.children.length; ) {
        const h = n.children[d];
        if (h && h.type === "listItem" && h.children && h.children[0] && h.children[0].type === "thematicBreak") {
          a = !0;
          break;
        }
      }
    }
  }
  a && (s = l), t.bulletCurrent = s;
  const c = t.containerFlow(n, r);
  return t.bulletLastUsed = s, t.bulletCurrent = o, i(), c;
}
function ES(n) {
  const e = n.options.listItemIndent || "one";
  if (e !== "tab" && e !== "one" && e !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + e + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return e;
}
function MS(n, e, t, r) {
  const i = ES(t);
  let o = t.bulletCurrent || $c(t);
  e && e.type === "list" && e.ordered && (o = (typeof e.start == "number" && e.start > -1 ? e.start : 1) + (t.options.incrementListMarker === !1 ? 0 : e.children.indexOf(n)) + o);
  let s = o.length + 1;
  (i === "tab" || i === "mixed" && (e && e.type === "list" && e.spread || n.spread)) && (s = Math.ceil(s / 4) * 4);
  const l = t.createTracker(r);
  l.move(o + " ".repeat(s - o.length)), l.shift(s);
  const a = t.enter("listItem"), c = t.indentLines(
    t.containerFlow(n, l.current()),
    u
  );
  return a(), c;
  function u(d, h, f) {
    return h ? (f ? "" : " ".repeat(s)) + d : (f ? o : o + " ".repeat(s - o.length)) + d;
  }
}
function TS(n, e, t, r) {
  const i = t.enter("paragraph"), o = t.enter("phrasing"), s = t.containerPhrasing(n, r);
  return o(), i(), s;
}
const NS = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  il([
    "break",
    "delete",
    "emphasis",
    // To do: next major: removed since footnotes were added to GFM.
    "footnote",
    "footnoteReference",
    "image",
    "imageReference",
    "inlineCode",
    // Enabled by `mdast-util-math`:
    "inlineMath",
    "link",
    "linkReference",
    // Enabled by `mdast-util-mdx`:
    "mdxJsxTextElement",
    // Enabled by `mdast-util-mdx`:
    "mdxTextExpression",
    "strong",
    "text",
    // Enabled by `mdast-util-directive`:
    "textDirective"
  ])
);
function IS(n, e, t, r) {
  return (n.children.some(function(s) {
    return NS(s);
  }) ? t.containerPhrasing : t.containerFlow).call(t, n, r);
}
function AS(n) {
  const e = n.options.strong || "*";
  if (e !== "*" && e !== "_")
    throw new Error(
      "Cannot serialize strong with `" + e + "` for `options.strong`, expected `*`, or `_`"
    );
  return e;
}
Ap.peek = OS;
function Ap(n, e, t, r) {
  const i = AS(t), o = t.enter("strong"), s = t.createTracker(r), l = s.move(i + i);
  let a = s.move(
    t.containerPhrasing(n, {
      after: i,
      before: l,
      ...s.current()
    })
  );
  const c = a.charCodeAt(0), u = Ls(
    r.before.charCodeAt(r.before.length - 1),
    c,
    i
  );
  u.inside && (a = Nn(c) + a.slice(1));
  const d = a.charCodeAt(a.length - 1), h = Ls(r.after.charCodeAt(0), d, i);
  h.inside && (a = a.slice(0, -1) + Nn(d));
  const f = s.move(i + i);
  return o(), t.attentionEncodeSurroundingInfo = {
    after: h.outside,
    before: u.outside
  }, l + a + f;
}
function OS(n, e, t) {
  return t.options.strong || "*";
}
function RS(n, e, t, r) {
  return t.safe(n.value, r);
}
function DS(n) {
  const e = n.options.ruleRepetition || 3;
  if (e < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + e + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return e;
}
function LS(n, e, t) {
  const r = (Ip(t) + (t.options.ruleSpaces ? " " : "")).repeat(DS(t));
  return t.options.ruleSpaces ? r.slice(0, -1) : r;
}
const zc = {
  blockquote: sS,
  break: Yd,
  code: uS,
  definition: hS,
  emphasis: wp,
  hardBreak: Yd,
  heading: mS,
  html: Sp,
  image: xp,
  imageReference: vp,
  inlineCode: Ep,
  link: Tp,
  linkReference: Np,
  list: vS,
  listItem: MS,
  paragraph: TS,
  root: IS,
  strong: Ap,
  text: RS,
  thematicBreak: LS
}, PS = [BS];
function BS(n, e, t, r) {
  if (e.type === "code" && ja(e, r) && (n.type === "list" || n.type === e.type && ja(n, r)))
    return !1;
  if ("spread" in t && typeof t.spread == "boolean")
    return n.type === "paragraph" && // Two paragraphs.
    (n.type === e.type || e.type === "definition" || // Paragraph followed by a setext heading.
    e.type === "heading" && Cp(e, r)) ? void 0 : t.spread ? 1 : 0;
}
const zn = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
], $S = [
  { character: "	", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: "	", before: "[\\r\\n]", inConstruct: "phrasing" },
  {
    character: "	",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
  },
  {
    character: "\r",
    inConstruct: [
      "codeFencedLangGraveAccent",
      "codeFencedLangTilde",
      "codeFencedMetaGraveAccent",
      "codeFencedMetaTilde",
      "destinationLiteral",
      "headingAtx"
    ]
  },
  {
    character: `
`,
    inConstruct: [
      "codeFencedLangGraveAccent",
      "codeFencedLangTilde",
      "codeFencedMetaGraveAccent",
      "codeFencedMetaTilde",
      "destinationLiteral",
      "headingAtx"
    ]
  },
  { character: " ", after: "[\\r\\n]", inConstruct: "phrasing" },
  { character: " ", before: "[\\r\\n]", inConstruct: "phrasing" },
  {
    character: " ",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
  },
  // An exclamation mark can start an image, if it is followed by a link or
  // a link reference.
  {
    character: "!",
    after: "\\[",
    inConstruct: "phrasing",
    notInConstruct: zn
  },
  // A quote can break out of a title.
  { character: '"', inConstruct: "titleQuote" },
  // A number sign could start an ATX heading if it starts a line.
  { atBreak: !0, character: "#" },
  { character: "#", inConstruct: "headingAtx", after: `(?:[\r
]|$)` },
  // Dollar sign and percentage are not used in markdown.
  // An ampersand could start a character reference.
  { character: "&", after: "[#A-Za-z]", inConstruct: "phrasing" },
  // An apostrophe can break out of a title.
  { character: "'", inConstruct: "titleApostrophe" },
  // A left paren could break out of a destination raw.
  { character: "(", inConstruct: "destinationRaw" },
  // A left paren followed by `]` could make something into a link or image.
  {
    before: "\\]",
    character: "(",
    inConstruct: "phrasing",
    notInConstruct: zn
  },
  // A right paren could start a list item or break out of a destination
  // raw.
  { atBreak: !0, before: "\\d+", character: ")" },
  { character: ")", inConstruct: "destinationRaw" },
  // An asterisk can start thematic breaks, list items, emphasis, strong.
  { atBreak: !0, character: "*", after: `(?:[ 	\r
*])` },
  { character: "*", inConstruct: "phrasing", notInConstruct: zn },
  // A plus sign could start a list item.
  { atBreak: !0, character: "+", after: `(?:[ 	\r
])` },
  // A dash can start thematic breaks, list items, and setext heading
  // underlines.
  { atBreak: !0, character: "-", after: `(?:[ 	\r
-])` },
  // A dot could start a list item.
  { atBreak: !0, before: "\\d+", character: ".", after: `(?:[ 	\r
]|$)` },
  // Slash, colon, and semicolon are not used in markdown for constructs.
  // A less than can start html (flow or text) or an autolink.
  // HTML could start with an exclamation mark (declaration, cdata, comment),
  // slash (closing tag), question mark (instruction), or a letter (tag).
  // An autolink also starts with a letter.
  // Finally, it could break out of a destination literal.
  { atBreak: !0, character: "<", after: "[!/?A-Za-z]" },
  {
    character: "<",
    after: "[!/?A-Za-z]",
    inConstruct: "phrasing",
    notInConstruct: zn
  },
  { character: "<", inConstruct: "destinationLiteral" },
  // An equals to can start setext heading underlines.
  { atBreak: !0, character: "=" },
  // A greater than can start block quotes and it can break out of a
  // destination literal.
  { atBreak: !0, character: ">" },
  { character: ">", inConstruct: "destinationLiteral" },
  // Question mark and at sign are not used in markdown for constructs.
  // A left bracket can start definitions, references, labels,
  { atBreak: !0, character: "[" },
  { character: "[", inConstruct: "phrasing", notInConstruct: zn },
  { character: "[", inConstruct: ["label", "reference"] },
  // A backslash can start an escape (when followed by punctuation) or a
  // hard break (when followed by an eol).
  // Note: typical escapes are handled in `safe`!
  { character: "\\", after: "[\\r\\n]", inConstruct: "phrasing" },
  // A right bracket can exit labels.
  { character: "]", inConstruct: ["label", "reference"] },
  // Caret is not used in markdown for constructs.
  // An underscore can start emphasis, strong, or a thematic break.
  { atBreak: !0, character: "_" },
  { character: "_", inConstruct: "phrasing", notInConstruct: zn },
  // A grave accent can start code (fenced or text), or it can break out of
  // a grave accent code fence.
  { atBreak: !0, character: "`" },
  {
    character: "`",
    inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
  },
  { character: "`", inConstruct: "phrasing", notInConstruct: zn },
  // Left brace, vertical bar, right brace are not used in markdown for
  // constructs.
  // A tilde can start code (fenced).
  { atBreak: !0, character: "~" }
];
function zS(n) {
  return n.label || !n.identifier ? n.label || "" : cp(n.identifier);
}
function FS(n) {
  if (!n._compiled) {
    const e = (n.atBreak ? "[\\r\\n][\\t ]*" : "") + (n.before ? "(?:" + n.before + ")" : "");
    n._compiled = new RegExp(
      (e ? "(" + e + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(n.character) ? "\\" : "") + n.character + (n.after ? "(?:" + n.after + ")" : ""),
      "g"
    );
  }
  return n._compiled;
}
function _S(n, e, t) {
  const r = e.indexStack, i = n.children || [], o = [];
  let s = -1, l = t.before, a;
  r.push(-1);
  let c = e.createTracker(t);
  for (; ++s < i.length; ) {
    const u = i[s];
    let d;
    if (r[r.length - 1] = s, s + 1 < i.length) {
      let p = e.handle.handlers[i[s + 1].type];
      p && p.peek && (p = p.peek), d = p ? p(i[s + 1], n, e, {
        before: "",
        after: "",
        ...c.current()
      }).charAt(0) : "";
    } else
      d = t.after;
    o.length > 0 && (l === "\r" || l === `
`) && u.type === "html" && (o[o.length - 1] = o[o.length - 1].replace(
      /(\r?\n|\r)$/,
      " "
    ), l = " ", c = e.createTracker(t), c.move(o.join("")));
    let h = e.handle(u, n, e, {
      ...c.current(),
      after: d,
      before: l
    });
    a && a === h.slice(0, 1) && (h = Nn(a.charCodeAt(0)) + h.slice(1));
    const f = e.attentionEncodeSurroundingInfo;
    e.attentionEncodeSurroundingInfo = void 0, a = void 0, f && (o.length > 0 && f.before && l === o[o.length - 1].slice(-1) && (o[o.length - 1] = o[o.length - 1].slice(0, -1) + Nn(l.charCodeAt(0))), f.after && (a = d)), c.move(h), o.push(h), l = h.slice(-1);
  }
  return r.pop(), o.join("");
}
function HS(n, e, t) {
  const r = e.indexStack, i = n.children || [], o = e.createTracker(t), s = [];
  let l = -1;
  for (r.push(-1); ++l < i.length; ) {
    const a = i[l];
    r[r.length - 1] = l, s.push(
      o.move(
        e.handle(a, n, e, {
          before: `
`,
          after: `
`,
          ...o.current()
        })
      )
    ), a.type !== "list" && (e.bulletLastUsed = void 0), l < i.length - 1 && s.push(
      o.move(qS(a, i[l + 1], n, e))
    );
  }
  return r.pop(), s.join("");
}
function qS(n, e, t, r) {
  let i = r.join.length;
  for (; i--; ) {
    const o = r.join[i](n, e, t, r);
    if (o === !0 || o === 1)
      break;
    if (typeof o == "number")
      return `
`.repeat(1 + o);
    if (o === !1)
      return `

<!---->

`;
  }
  return `

`;
}
const jS = /\r?\n|\r/g;
function VS(n, e) {
  const t = [];
  let r = 0, i = 0, o;
  for (; o = jS.exec(n); )
    s(n.slice(r, o.index)), t.push(o[0]), r = o.index + o[0].length, i++;
  return s(n.slice(r)), t.join("");
  function s(l) {
    t.push(e(l, i, !l));
  }
}
function US(n, e, t) {
  const r = (t.before || "") + (e || "") + (t.after || ""), i = [], o = [], s = {};
  let l = -1;
  for (; ++l < n.unsafe.length; ) {
    const u = n.unsafe[l];
    if (!kp(n.stack, u))
      continue;
    const d = n.compilePattern(u);
    let h;
    for (; h = d.exec(r); ) {
      const f = "before" in u || !!u.atBreak, p = "after" in u, m = h.index + (f ? h[1].length : 0);
      i.includes(m) ? (s[m].before && !f && (s[m].before = !1), s[m].after && !p && (s[m].after = !1)) : (i.push(m), s[m] = { before: f, after: p });
    }
  }
  i.sort(WS);
  let a = t.before ? t.before.length : 0;
  const c = r.length - (t.after ? t.after.length : 0);
  for (l = -1; ++l < i.length; ) {
    const u = i[l];
    u < a || u >= c || u + 1 < c && i[l + 1] === u + 1 && s[u].after && !s[u + 1].before && !s[u + 1].after || i[l - 1] === u - 1 && s[u].before && !s[u - 1].before && !s[u - 1].after || (a !== u && o.push(Xd(r.slice(a, u), "\\")), a = u, /[!-/:-@[-`{-~]/.test(r.charAt(u)) && (!t.encode || !t.encode.includes(r.charAt(u))) ? o.push("\\") : (o.push(Nn(r.charCodeAt(u))), a++));
  }
  return o.push(Xd(r.slice(a, c), t.after)), o.join("");
}
function WS(n, e) {
  return n - e;
}
function Xd(n, e) {
  const t = /\\(?=[!-/:-@[-`{-~])/g, r = [], i = [], o = n + e;
  let s = -1, l = 0, a;
  for (; a = t.exec(o); )
    r.push(a.index);
  for (; ++s < r.length; )
    l !== r[s] && i.push(n.slice(l, r[s])), i.push("\\"), l = r[s];
  return i.push(n.slice(l)), i.join("");
}
function KS(n) {
  const e = n || {}, t = e.now || {};
  let r = e.lineShift || 0, i = t.line || 1, o = t.column || 1;
  return { move: a, current: s, shift: l };
  function s() {
    return { now: { line: i, column: o }, lineShift: r };
  }
  function l(c) {
    r += c;
  }
  function a(c) {
    const u = c || "", d = u.split(/\r?\n|\r/g), h = d[d.length - 1];
    return i += d.length - 1, o = d.length === 1 ? o + h.length : 1 + h.length + r, u;
  }
}
function JS(n, e) {
  const t = e || {}, r = {
    associationId: zS,
    containerPhrasing: QS,
    containerFlow: ZS,
    createTracker: KS,
    compilePattern: FS,
    enter: o,
    // @ts-expect-error: GFM / frontmatter are typed in `mdast` but not defined
    // here.
    handlers: { ...zc },
    // @ts-expect-error: add `handle` in a second.
    handle: void 0,
    indentLines: VS,
    indexStack: [],
    join: [...PS],
    options: {},
    safe: ex,
    stack: [],
    unsafe: [...$S]
  };
  bp(r, t), r.options.tightDefinitions && r.join.push(XS), r.handle = yp("type", {
    invalid: GS,
    unknown: YS,
    handlers: r.handlers
  });
  let i = r.handle(n, void 0, r, {
    before: `
`,
    after: `
`,
    now: { line: 1, column: 1 },
    lineShift: 0
  });
  return i && i.charCodeAt(i.length - 1) !== 10 && i.charCodeAt(i.length - 1) !== 13 && (i += `
`), i;
  function o(s) {
    return r.stack.push(s), l;
    function l() {
      r.stack.pop();
    }
  }
}
function GS(n) {
  throw new Error("Cannot handle value `" + n + "`, expected node");
}
function YS(n) {
  const e = (
    /** @type {Nodes} */
    n
  );
  throw new Error("Cannot handle unknown node `" + e.type + "`");
}
function XS(n, e) {
  if (n.type === "definition" && n.type === e.type)
    return 0;
}
function QS(n, e) {
  return _S(n, this, e);
}
function ZS(n, e) {
  return HS(n, this, e);
}
function ex(n, e) {
  return US(this, n, e);
}
function tx() {
  return {
    enter: {
      table: nx,
      tableData: Qd,
      tableHeader: Qd,
      tableRow: ix
    },
    exit: {
      codeText: ox,
      table: rx,
      tableData: Wl,
      tableHeader: Wl,
      tableRow: Wl
    }
  };
}
function nx(n) {
  const e = n._align;
  this.enter(
    {
      type: "table",
      align: e.map(function(t) {
        return t === "none" ? null : t;
      }),
      children: []
    },
    n
  ), this.data.inTable = !0;
}
function rx(n) {
  this.exit(n), this.data.inTable = void 0;
}
function ix(n) {
  this.enter({ type: "tableRow", children: [] }, n);
}
function Wl(n) {
  this.exit(n);
}
function Qd(n) {
  this.enter({ type: "tableCell", children: [] }, n);
}
function ox(n) {
  let e = this.resume();
  this.data.inTable && (e = e.replace(/\\([\\|])/g, sx));
  const t = this.stack[this.stack.length - 1];
  t.type, t.value = e, this.exit(n);
}
function sx(n, e) {
  return e === "|" ? e : n;
}
function lx(n) {
  const e = n || {}, t = e.tableCellPadding, r = e.tablePipeAlign, i = e.stringLength, o = t ? " " : "|";
  return {
    unsafe: [
      { character: "\r", inConstruct: "tableCell" },
      { character: `
`, inConstruct: "tableCell" },
      // A pipe, when followed by a tab or space (padding), or a dash or colon
      // (unpadded delimiter row), could result in a table.
      { atBreak: !0, character: "|", after: "[	 :-]" },
      // A pipe in a cell must be encoded.
      { character: "|", inConstruct: "tableCell" },
      // A colon must be followed by a dash, in which case it could start a
      // delimiter row.
      { atBreak: !0, character: ":", after: "-" },
      // A delimiter row can also start with a dash, when followed by more
      // dashes, a colon, or a pipe.
      // This is a stricter version than the built in check for lists, thematic
      // breaks, and setex heading underlines though:
      // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/51a2038/lib/unsafe.js#L57>
      { atBreak: !0, character: "-", after: "[:|-]" }
    ],
    handlers: {
      inlineCode: h,
      table: s,
      tableCell: a,
      tableRow: l
    }
  };
  function s(f, p, m, y) {
    return c(u(f, m, y), f.align);
  }
  function l(f, p, m, y) {
    const g = d(f, m, y), C = c([g]);
    return C.slice(0, C.indexOf(`
`));
  }
  function a(f, p, m, y) {
    const g = m.enter("tableCell"), C = m.enter("phrasing"), x = m.containerPhrasing(f, {
      ...y,
      before: o,
      after: o
    });
    return C(), g(), x;
  }
  function c(f, p) {
    return nS(f, {
      align: p,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: t,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function u(f, p, m) {
    const y = f.children;
    let g = -1;
    const C = [], x = p.enter("table");
    for (; ++g < y.length; )
      C[g] = d(y[g], p, m);
    return x(), C;
  }
  function d(f, p, m) {
    const y = f.children;
    let g = -1;
    const C = [], x = p.enter("tableRow");
    for (; ++g < y.length; )
      C[g] = a(y[g], f, p, m);
    return x(), C;
  }
  function h(f, p, m) {
    let y = zc.inlineCode(f, p, m);
    return m.stack.includes("tableCell") && (y = y.replace(/\|/g, "\\$&")), y;
  }
}
function ax() {
  return {
    exit: {
      taskListCheckValueChecked: Zd,
      taskListCheckValueUnchecked: Zd,
      paragraph: ux
    }
  };
}
function cx() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: dx }
  };
}
function Zd(n) {
  const e = this.stack[this.stack.length - 2];
  e.type, e.checked = n.type === "taskListCheckValueChecked";
}
function ux(n) {
  const e = this.stack[this.stack.length - 2];
  if (e && e.type === "listItem" && typeof e.checked == "boolean") {
    const t = this.stack[this.stack.length - 1];
    t.type;
    const r = t.children[0];
    if (r && r.type === "text") {
      const i = e.children;
      let o = -1, s;
      for (; ++o < i.length; ) {
        const l = i[o];
        if (l.type === "paragraph") {
          s = l;
          break;
        }
      }
      s === t && (r.value = r.value.slice(1), r.value.length === 0 ? t.children.shift() : t.position && r.position && typeof r.position.start.offset == "number" && (r.position.start.column++, r.position.start.offset++, t.position.start = Object.assign({}, r.position.start)));
    }
  }
  this.exit(n);
}
function dx(n, e, t, r) {
  const i = n.children[0], o = typeof n.checked == "boolean" && i && i.type === "paragraph", s = "[" + (n.checked ? "x" : " ") + "] ", l = t.createTracker(r);
  o && l.move(s);
  let a = zc.listItem(n, e, t, {
    ...r,
    ...l.current()
  });
  return o && (a = a.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, c)), a;
  function c(u) {
    return u + s;
  }
}
function hx() {
  return [
    EC(),
    WC(),
    YC(),
    tx(),
    ax()
  ];
}
function fx(n) {
  return {
    extensions: [
      MC(),
      KC(n),
      XC(),
      lx(n),
      cx()
    ]
  };
}
const px = {
  tokenize: wx,
  partial: !0
}, Op = {
  tokenize: Cx,
  partial: !0
}, Rp = {
  tokenize: Sx,
  partial: !0
}, Dp = {
  tokenize: xx,
  partial: !0
}, mx = {
  tokenize: vx,
  partial: !0
}, Lp = {
  name: "wwwAutolink",
  tokenize: bx,
  previous: Bp
}, Pp = {
  name: "protocolAutolink",
  tokenize: kx,
  previous: $p
}, on = {
  name: "emailAutolink",
  tokenize: yx,
  previous: zp
}, Lt = {};
function gx() {
  return {
    text: Lt
  };
}
let Fn = 48;
for (; Fn < 123; )
  Lt[Fn] = on, Fn++, Fn === 58 ? Fn = 65 : Fn === 91 && (Fn = 97);
Lt[43] = on;
Lt[45] = on;
Lt[46] = on;
Lt[95] = on;
Lt[72] = [on, Pp];
Lt[104] = [on, Pp];
Lt[87] = [on, Lp];
Lt[119] = [on, Lp];
function yx(n, e, t) {
  const r = this;
  let i, o;
  return s;
  function s(d) {
    return !Va(d) || !zp.call(r, r.previous) || Fc(r.events) ? t(d) : (n.enter("literalAutolink"), n.enter("literalAutolinkEmail"), l(d));
  }
  function l(d) {
    return Va(d) ? (n.consume(d), l) : d === 64 ? (n.consume(d), a) : t(d);
  }
  function a(d) {
    return d === 46 ? n.check(mx, u, c)(d) : d === 45 || d === 95 || Oe(d) ? (o = !0, n.consume(d), a) : u(d);
  }
  function c(d) {
    return n.consume(d), i = !0, a;
  }
  function u(d) {
    return o && i && Pe(r.previous) ? (n.exit("literalAutolinkEmail"), n.exit("literalAutolink"), e(d)) : t(d);
  }
}
function bx(n, e, t) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !Bp.call(r, r.previous) || Fc(r.events) ? t(s) : (n.enter("literalAutolink"), n.enter("literalAutolinkWww"), n.check(px, n.attempt(Op, n.attempt(Rp, o), t), t)(s));
  }
  function o(s) {
    return n.exit("literalAutolinkWww"), n.exit("literalAutolink"), e(s);
  }
}
function kx(n, e, t) {
  const r = this;
  let i = "", o = !1;
  return s;
  function s(d) {
    return (d === 72 || d === 104) && $p.call(r, r.previous) && !Fc(r.events) ? (n.enter("literalAutolink"), n.enter("literalAutolinkHttp"), i += String.fromCodePoint(d), n.consume(d), l) : t(d);
  }
  function l(d) {
    if (Pe(d) && i.length < 5)
      return i += String.fromCodePoint(d), n.consume(d), l;
    if (d === 58) {
      const h = i.toLowerCase();
      if (h === "http" || h === "https")
        return n.consume(d), a;
    }
    return t(d);
  }
  function a(d) {
    return d === 47 ? (n.consume(d), o ? c : (o = !0, a)) : t(d);
  }
  function c(d) {
    return d === null || Rs(d) || le(d) || sr(d) || nl(d) ? t(d) : n.attempt(Op, n.attempt(Rp, u), t)(d);
  }
  function u(d) {
    return n.exit("literalAutolinkHttp"), n.exit("literalAutolink"), e(d);
  }
}
function wx(n, e, t) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, n.consume(s), i) : s === 46 && r === 3 ? (n.consume(s), o) : t(s);
  }
  function o(s) {
    return s === null ? t(s) : e(s);
  }
}
function Cx(n, e, t) {
  let r, i, o;
  return s;
  function s(c) {
    return c === 46 || c === 95 ? n.check(Dp, a, l)(c) : c === null || le(c) || sr(c) || c !== 45 && nl(c) ? a(c) : (o = !0, n.consume(c), s);
  }
  function l(c) {
    return c === 95 ? r = !0 : (i = r, r = void 0), n.consume(c), s;
  }
  function a(c) {
    return i || r || !o ? t(c) : e(c);
  }
}
function Sx(n, e) {
  let t = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (t++, n.consume(s), i) : s === 41 && r < t ? o(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? n.check(Dp, e, o)(s) : s === null || le(s) || sr(s) ? e(s) : (n.consume(s), i);
  }
  function o(s) {
    return s === 41 && r++, n.consume(s), i;
  }
}
function xx(n, e, t) {
  return r;
  function r(l) {
    return l === 33 || l === 34 || l === 39 || l === 41 || l === 42 || l === 44 || l === 46 || l === 58 || l === 59 || l === 63 || l === 95 || l === 126 ? (n.consume(l), r) : l === 38 ? (n.consume(l), o) : l === 93 ? (n.consume(l), i) : (
      // `<` is an end.
      l === 60 || // So is whitespace.
      l === null || le(l) || sr(l) ? e(l) : t(l)
    );
  }
  function i(l) {
    return l === null || l === 40 || l === 91 || le(l) || sr(l) ? e(l) : r(l);
  }
  function o(l) {
    return Pe(l) ? s(l) : t(l);
  }
  function s(l) {
    return l === 59 ? (n.consume(l), r) : Pe(l) ? (n.consume(l), s) : t(l);
  }
}
function vx(n, e, t) {
  return r;
  function r(o) {
    return n.consume(o), i;
  }
  function i(o) {
    return Oe(o) ? t(o) : e(o);
  }
}
function Bp(n) {
  return n === null || n === 40 || n === 42 || n === 95 || n === 91 || n === 93 || n === 126 || le(n);
}
function $p(n) {
  return !Pe(n);
}
function zp(n) {
  return !(n === 47 || Va(n));
}
function Va(n) {
  return n === 43 || n === 45 || n === 46 || n === 95 || Oe(n);
}
function Fc(n) {
  let e = n.length, t = !1;
  for (; e--; ) {
    const r = n[e][1];
    if ((r.type === "labelLink" || r.type === "labelImage") && !r._balanced) {
      t = !0;
      break;
    }
    if (r._gfmAutolinkLiteralWalkedInto) {
      t = !1;
      break;
    }
  }
  return n.length > 0 && !t && (n[n.length - 1][1]._gfmAutolinkLiteralWalkedInto = !0), t;
}
const Ex = {
  tokenize: Dx,
  partial: !0
};
function Mx() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: Ax,
        continuation: {
          tokenize: Ox
        },
        exit: Rx
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: Ix
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: Tx,
        resolveTo: Nx
      }
    }
  };
}
function Tx(n, e, t) {
  const r = this;
  let i = r.events.length;
  const o = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let s;
  for (; i--; ) {
    const a = r.events[i][1];
    if (a.type === "labelImage") {
      s = a;
      break;
    }
    if (a.type === "gfmFootnoteCall" || a.type === "labelLink" || a.type === "label" || a.type === "image" || a.type === "link")
      break;
  }
  return l;
  function l(a) {
    if (!s || !s._balanced)
      return t(a);
    const c = Et(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return c.codePointAt(0) !== 94 || !o.includes(c.slice(1)) ? t(a) : (n.enter("gfmFootnoteCallLabelMarker"), n.consume(a), n.exit("gfmFootnoteCallLabelMarker"), e(a));
  }
}
function Nx(n, e) {
  let t = n.length;
  for (; t--; )
    if (n[t][1].type === "labelImage" && n[t][0] === "enter") {
      n[t][1];
      break;
    }
  n[t + 1][1].type = "data", n[t + 3][1].type = "gfmFootnoteCallLabelMarker";
  const r = {
    type: "gfmFootnoteCall",
    start: Object.assign({}, n[t + 3][1].start),
    end: Object.assign({}, n[n.length - 1][1].end)
  }, i = {
    type: "gfmFootnoteCallMarker",
    start: Object.assign({}, n[t + 3][1].end),
    end: Object.assign({}, n[t + 3][1].end)
  };
  i.end.column++, i.end.offset++, i.end._bufferIndex++;
  const o = {
    type: "gfmFootnoteCallString",
    start: Object.assign({}, i.end),
    end: Object.assign({}, n[n.length - 1][1].start)
  }, s = {
    type: "chunkString",
    contentType: "string",
    start: Object.assign({}, o.start),
    end: Object.assign({}, o.end)
  }, l = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    n[t + 1],
    n[t + 2],
    ["enter", r, e],
    // The `[`
    n[t + 3],
    n[t + 4],
    // The `^`.
    ["enter", i, e],
    ["exit", i, e],
    // Everything in between.
    ["enter", o, e],
    ["enter", s, e],
    ["exit", s, e],
    ["exit", o, e],
    // The ending (`]`, properly parsed and labelled).
    n[n.length - 2],
    n[n.length - 1],
    ["exit", r, e]
  ];
  return n.splice(t, n.length - t + 1, ...l), n;
}
function Ix(n, e, t) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let o = 0, s;
  return l;
  function l(d) {
    return n.enter("gfmFootnoteCall"), n.enter("gfmFootnoteCallLabelMarker"), n.consume(d), n.exit("gfmFootnoteCallLabelMarker"), a;
  }
  function a(d) {
    return d !== 94 ? t(d) : (n.enter("gfmFootnoteCallMarker"), n.consume(d), n.exit("gfmFootnoteCallMarker"), n.enter("gfmFootnoteCallString"), n.enter("chunkString").contentType = "string", c);
  }
  function c(d) {
    if (
      // Too long.
      o > 999 || // Closing brace with nothing.
      d === 93 && !s || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      d === null || d === 91 || le(d)
    )
      return t(d);
    if (d === 93) {
      n.exit("chunkString");
      const h = n.exit("gfmFootnoteCallString");
      return i.includes(Et(r.sliceSerialize(h))) ? (n.enter("gfmFootnoteCallLabelMarker"), n.consume(d), n.exit("gfmFootnoteCallLabelMarker"), n.exit("gfmFootnoteCall"), e) : t(d);
    }
    return le(d) || (s = !0), o++, n.consume(d), d === 92 ? u : c;
  }
  function u(d) {
    return d === 91 || d === 92 || d === 93 ? (n.consume(d), o++, c) : c(d);
  }
}
function Ax(n, e, t) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let o, s = 0, l;
  return a;
  function a(p) {
    return n.enter("gfmFootnoteDefinition")._container = !0, n.enter("gfmFootnoteDefinitionLabel"), n.enter("gfmFootnoteDefinitionLabelMarker"), n.consume(p), n.exit("gfmFootnoteDefinitionLabelMarker"), c;
  }
  function c(p) {
    return p === 94 ? (n.enter("gfmFootnoteDefinitionMarker"), n.consume(p), n.exit("gfmFootnoteDefinitionMarker"), n.enter("gfmFootnoteDefinitionLabelString"), n.enter("chunkString").contentType = "string", u) : t(p);
  }
  function u(p) {
    if (
      // Too long.
      s > 999 || // Closing brace with nothing.
      p === 93 && !l || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      p === null || p === 91 || le(p)
    )
      return t(p);
    if (p === 93) {
      n.exit("chunkString");
      const m = n.exit("gfmFootnoteDefinitionLabelString");
      return o = Et(r.sliceSerialize(m)), n.enter("gfmFootnoteDefinitionLabelMarker"), n.consume(p), n.exit("gfmFootnoteDefinitionLabelMarker"), n.exit("gfmFootnoteDefinitionLabel"), h;
    }
    return le(p) || (l = !0), s++, n.consume(p), p === 92 ? d : u;
  }
  function d(p) {
    return p === 91 || p === 92 || p === 93 ? (n.consume(p), s++, u) : u(p);
  }
  function h(p) {
    return p === 58 ? (n.enter("definitionMarker"), n.consume(p), n.exit("definitionMarker"), i.includes(o) || i.push(o), Z(n, f, "gfmFootnoteDefinitionWhitespace")) : t(p);
  }
  function f(p) {
    return e(p);
  }
}
function Ox(n, e, t) {
  return n.check(xo, e, n.attempt(Ex, e, t));
}
function Rx(n) {
  n.exit("gfmFootnoteDefinition");
}
function Dx(n, e, t) {
  const r = this;
  return Z(n, i, "gfmFootnoteDefinitionIndent", 5);
  function i(o) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? e(o) : t(o);
  }
}
function Lx(n) {
  let t = (n || {}).singleTilde;
  const r = {
    name: "strikethrough",
    tokenize: o,
    resolveAll: i
  };
  return t == null && (t = !0), {
    text: {
      126: r
    },
    insideSpan: {
      null: [r]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function i(s, l) {
    let a = -1;
    for (; ++a < s.length; )
      if (s[a][0] === "enter" && s[a][1].type === "strikethroughSequenceTemporary" && s[a][1]._close) {
        let c = a;
        for (; c--; )
          if (s[c][0] === "exit" && s[c][1].type === "strikethroughSequenceTemporary" && s[c][1]._open && // If the sizes are the same:
          s[a][1].end.offset - s[a][1].start.offset === s[c][1].end.offset - s[c][1].start.offset) {
            s[a][1].type = "strikethroughSequence", s[c][1].type = "strikethroughSequence";
            const u = {
              type: "strikethrough",
              start: Object.assign({}, s[c][1].start),
              end: Object.assign({}, s[a][1].end)
            }, d = {
              type: "strikethroughText",
              start: Object.assign({}, s[c][1].end),
              end: Object.assign({}, s[a][1].start)
            }, h = [["enter", u, l], ["enter", s[c][1], l], ["exit", s[c][1], l], ["enter", d, l]], f = l.parser.constructs.insideSpan.null;
            f && et(h, h.length, 0, rl(f, s.slice(c + 1, a), l)), et(h, h.length, 0, [["exit", d, l], ["enter", s[a][1], l], ["exit", s[a][1], l], ["exit", u, l]]), et(s, c - 1, a - c + 3, h), a = c + h.length - 2;
            break;
          }
      }
    for (a = -1; ++a < s.length; )
      s[a][1].type === "strikethroughSequenceTemporary" && (s[a][1].type = "data");
    return s;
  }
  function o(s, l, a) {
    const c = this.previous, u = this.events;
    let d = 0;
    return h;
    function h(p) {
      return c === 126 && u[u.length - 1][1].type !== "characterEscape" ? a(p) : (s.enter("strikethroughSequenceTemporary"), f(p));
    }
    function f(p) {
      const m = Xr(c);
      if (p === 126)
        return d > 1 ? a(p) : (s.consume(p), d++, f);
      if (d < 2 && !t) return a(p);
      const y = s.exit("strikethroughSequenceTemporary"), g = Xr(p);
      return y._open = !g || g === 2 && !!m, y._close = !m || m === 2 && !!g, l(p);
    }
  }
}
class Px {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   * @param {number} remove
   * @param {Array<Event>} add
   * @returns {undefined}
   */
  add(e, t, r) {
    Bx(this, e, t, r);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   * @returns {undefined}
   */
  consume(e) {
    if (this.map.sort(function(o, s) {
      return o[0] - s[0];
    }), this.map.length === 0)
      return;
    let t = this.map.length;
    const r = [];
    for (; t > 0; )
      t -= 1, r.push(e.slice(this.map[t][0] + this.map[t][1]), this.map[t][2]), e.length = this.map[t][0];
    r.push(e.slice()), e.length = 0;
    let i = r.pop();
    for (; i; ) {
      for (const o of i)
        e.push(o);
      i = r.pop();
    }
    this.map.length = 0;
  }
}
function Bx(n, e, t, r) {
  let i = 0;
  if (!(t === 0 && r.length === 0)) {
    for (; i < n.map.length; ) {
      if (n.map[i][0] === e) {
        n.map[i][1] += t, n.map[i][2].push(...r);
        return;
      }
      i += 1;
    }
    n.map.push([e, t, r]);
  }
}
function $x(n, e) {
  let t = !1;
  const r = [];
  for (; e < n.length; ) {
    const i = n[e];
    if (t) {
      if (i[0] === "enter")
        i[1].type === "tableContent" && r.push(n[e + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
      else if (i[1].type === "tableContent") {
        if (n[e - 1][1].type === "tableDelimiterMarker") {
          const o = r.length - 1;
          r[o] = r[o] === "left" ? "center" : "right";
        }
      } else if (i[1].type === "tableDelimiterRow")
        break;
    } else i[0] === "enter" && i[1].type === "tableDelimiterRow" && (t = !0);
    e += 1;
  }
  return r;
}
function zx() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: Fx,
        resolveAll: _x
      }
    }
  };
}
function Fx(n, e, t) {
  const r = this;
  let i = 0, o = 0, s;
  return l;
  function l(S) {
    let $ = r.events.length - 1;
    for (; $ > -1; ) {
      const de = r.events[$][1].type;
      if (de === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      de === "linePrefix") $--;
      else break;
    }
    const z = $ > -1 ? r.events[$][1].type : null, ie = z === "tableHead" || z === "tableRow" ? w : a;
    return ie === w && r.parser.lazy[r.now().line] ? t(S) : ie(S);
  }
  function a(S) {
    return n.enter("tableHead"), n.enter("tableRow"), c(S);
  }
  function c(S) {
    return S === 124 || (s = !0, o += 1), u(S);
  }
  function u(S) {
    return S === null ? t(S) : F(S) ? o > 1 ? (o = 0, r.interrupt = !0, n.exit("tableRow"), n.enter("lineEnding"), n.consume(S), n.exit("lineEnding"), f) : t(S) : Y(S) ? Z(n, u, "whitespace")(S) : (o += 1, s && (s = !1, i += 1), S === 124 ? (n.enter("tableCellDivider"), n.consume(S), n.exit("tableCellDivider"), s = !0, u) : (n.enter("data"), d(S)));
  }
  function d(S) {
    return S === null || S === 124 || le(S) ? (n.exit("data"), u(S)) : (n.consume(S), S === 92 ? h : d);
  }
  function h(S) {
    return S === 92 || S === 124 ? (n.consume(S), d) : d(S);
  }
  function f(S) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? t(S) : (n.enter("tableDelimiterRow"), s = !1, Y(S) ? Z(n, p, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(S) : p(S));
  }
  function p(S) {
    return S === 45 || S === 58 ? y(S) : S === 124 ? (s = !0, n.enter("tableCellDivider"), n.consume(S), n.exit("tableCellDivider"), m) : D(S);
  }
  function m(S) {
    return Y(S) ? Z(n, y, "whitespace")(S) : y(S);
  }
  function y(S) {
    return S === 58 ? (o += 1, s = !0, n.enter("tableDelimiterMarker"), n.consume(S), n.exit("tableDelimiterMarker"), g) : S === 45 ? (o += 1, g(S)) : S === null || F(S) ? L(S) : D(S);
  }
  function g(S) {
    return S === 45 ? (n.enter("tableDelimiterFiller"), C(S)) : D(S);
  }
  function C(S) {
    return S === 45 ? (n.consume(S), C) : S === 58 ? (s = !0, n.exit("tableDelimiterFiller"), n.enter("tableDelimiterMarker"), n.consume(S), n.exit("tableDelimiterMarker"), x) : (n.exit("tableDelimiterFiller"), x(S));
  }
  function x(S) {
    return Y(S) ? Z(n, L, "whitespace")(S) : L(S);
  }
  function L(S) {
    return S === 124 ? p(S) : S === null || F(S) ? !s || i !== o ? D(S) : (n.exit("tableDelimiterRow"), n.exit("tableHead"), e(S)) : D(S);
  }
  function D(S) {
    return t(S);
  }
  function w(S) {
    return n.enter("tableRow"), A(S);
  }
  function A(S) {
    return S === 124 ? (n.enter("tableCellDivider"), n.consume(S), n.exit("tableCellDivider"), A) : S === null || F(S) ? (n.exit("tableRow"), e(S)) : Y(S) ? Z(n, A, "whitespace")(S) : (n.enter("data"), B(S));
  }
  function B(S) {
    return S === null || S === 124 || le(S) ? (n.exit("data"), A(S)) : (n.consume(S), S === 92 ? H : B);
  }
  function H(S) {
    return S === 92 || S === 124 ? (n.consume(S), B) : B(S);
  }
}
function _x(n, e) {
  let t = -1, r = !0, i = 0, o = [0, 0, 0, 0], s = [0, 0, 0, 0], l = !1, a = 0, c, u, d;
  const h = new Px();
  for (; ++t < n.length; ) {
    const f = n[t], p = f[1];
    f[0] === "enter" ? p.type === "tableHead" ? (l = !1, a !== 0 && (eh(h, e, a, c, u), u = void 0, a = 0), c = {
      type: "table",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, h.add(t, 0, [["enter", c, e]])) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (r = !0, d = void 0, o = [0, 0, 0, 0], s = [0, t + 1, 0, 0], l && (l = !1, u = {
      type: "tableBody",
      start: Object.assign({}, p.start),
      // Note: correct end is set later.
      end: Object.assign({}, p.end)
    }, h.add(t, 0, [["enter", u, e]])), i = p.type === "tableDelimiterRow" ? 2 : u ? 3 : 1) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (o[1] !== 0 && (s[0] = s[1], d = Vo(h, e, o, i, void 0, d), o = [0, 0, 0, 0]), s[2] = t)) : p.type === "tableCellDivider" && (r ? r = !1 : (o[1] !== 0 && (s[0] = s[1], d = Vo(h, e, o, i, void 0, d)), o = s, s = [o[1], t, 0, 0])) : p.type === "tableHead" ? (l = !0, a = t) : p.type === "tableRow" || p.type === "tableDelimiterRow" ? (a = t, o[1] !== 0 ? (s[0] = s[1], d = Vo(h, e, o, i, t, d)) : s[1] !== 0 && (d = Vo(h, e, s, i, t, d)), i = 0) : i && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller") && (s[3] = t);
  }
  for (a !== 0 && eh(h, e, a, c, u), h.consume(e.events), t = -1; ++t < e.events.length; ) {
    const f = e.events[t];
    f[0] === "enter" && f[1].type === "table" && (f[1]._align = $x(e.events, t));
  }
  return n;
}
function Vo(n, e, t, r, i, o) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", l = "tableContent";
  t[0] !== 0 && (o.end = Object.assign({}, Sr(e.events, t[0])), n.add(t[0], 0, [["exit", o, e]]));
  const a = Sr(e.events, t[1]);
  if (o = {
    type: s,
    start: Object.assign({}, a),
    // Note: correct end is set later.
    end: Object.assign({}, a)
  }, n.add(t[1], 0, [["enter", o, e]]), t[2] !== 0) {
    const c = Sr(e.events, t[2]), u = Sr(e.events, t[3]), d = {
      type: l,
      start: Object.assign({}, c),
      end: Object.assign({}, u)
    };
    if (n.add(t[2], 0, [["enter", d, e]]), r !== 2) {
      const h = e.events[t[2]], f = e.events[t[3]];
      if (h[1].end = Object.assign({}, f[1].end), h[1].type = "chunkText", h[1].contentType = "text", t[3] > t[2] + 1) {
        const p = t[2] + 1, m = t[3] - t[2] - 1;
        n.add(p, m, []);
      }
    }
    n.add(t[3] + 1, 0, [["exit", d, e]]);
  }
  return i !== void 0 && (o.end = Object.assign({}, Sr(e.events, i)), n.add(i, 0, [["exit", o, e]]), o = void 0), o;
}
function eh(n, e, t, r, i) {
  const o = [], s = Sr(e.events, t);
  i && (i.end = Object.assign({}, s), o.push(["exit", i, e])), r.end = Object.assign({}, s), o.push(["exit", r, e]), n.add(t + 1, 0, o);
}
function Sr(n, e) {
  const t = n[e], r = t[0] === "enter" ? "start" : "end";
  return t[1][r];
}
const Hx = {
  name: "tasklistCheck",
  tokenize: jx
};
function qx() {
  return {
    text: {
      91: Hx
    }
  };
}
function jx(n, e, t) {
  const r = this;
  return i;
  function i(a) {
    return (
      // Exit if there’s stuff before.
      r.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !r._gfmTasklistFirstContentOfListItem ? t(a) : (n.enter("taskListCheck"), n.enter("taskListCheckMarker"), n.consume(a), n.exit("taskListCheckMarker"), o)
    );
  }
  function o(a) {
    return le(a) ? (n.enter("taskListCheckValueUnchecked"), n.consume(a), n.exit("taskListCheckValueUnchecked"), s) : a === 88 || a === 120 ? (n.enter("taskListCheckValueChecked"), n.consume(a), n.exit("taskListCheckValueChecked"), s) : t(a);
  }
  function s(a) {
    return a === 93 ? (n.enter("taskListCheckMarker"), n.consume(a), n.exit("taskListCheckMarker"), n.exit("taskListCheck"), l) : t(a);
  }
  function l(a) {
    return F(a) ? e(a) : Y(a) ? n.check({
      tokenize: Vx
    }, e, t)(a) : t(a);
  }
}
function Vx(n, e, t) {
  return Z(n, r, "whitespace");
  function r(i) {
    return i === null ? t(i) : e(i);
  }
}
function Ux(n) {
  return Qf([
    gx(),
    Mx(),
    Lx(n),
    zx(),
    qx()
  ]);
}
const Wx = {};
function _c(n) {
  const e = (
    /** @type {Processor<Root>} */
    this
  ), t = n || Wx, r = e.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), o = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(Ux(t)), o.push(hx()), s.push(fx(t));
}
function Kx(n, e) {
  const t = {
    type: "element",
    tagName: "blockquote",
    properties: {},
    children: n.wrap(n.all(e), !0)
  };
  return n.patch(e, t), n.applyData(e, t);
}
function Jx(n, e) {
  const t = { type: "element", tagName: "br", properties: {}, children: [] };
  return n.patch(e, t), [n.applyData(e, t), { type: "text", value: `
` }];
}
function Gx(n, e) {
  const t = e.value ? e.value + `
` : "", r = {};
  e.lang && (r.className = ["language-" + e.lang]);
  let i = {
    type: "element",
    tagName: "code",
    properties: r,
    children: [{ type: "text", value: t }]
  };
  return e.meta && (i.data = { meta: e.meta }), n.patch(e, i), i = n.applyData(e, i), i = { type: "element", tagName: "pre", properties: {}, children: [i] }, n.patch(e, i), i;
}
function Yx(n, e) {
  const t = {
    type: "element",
    tagName: "del",
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, t), n.applyData(e, t);
}
function Xx(n, e) {
  const t = {
    type: "element",
    tagName: "em",
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, t), n.applyData(e, t);
}
function Qx(n, e) {
  const t = typeof n.options.clobberPrefix == "string" ? n.options.clobberPrefix : "user-content-", r = String(e.identifier).toUpperCase(), i = ii(r.toLowerCase()), o = n.footnoteOrder.indexOf(r);
  let s, l = n.footnoteCounts.get(r);
  l === void 0 ? (l = 0, n.footnoteOrder.push(r), s = n.footnoteOrder.length) : s = o + 1, l += 1, n.footnoteCounts.set(r, l);
  const a = {
    type: "element",
    tagName: "a",
    properties: {
      href: "#" + t + "fn-" + i,
      id: t + "fnref-" + i + (l > 1 ? "-" + l : ""),
      dataFootnoteRef: !0,
      ariaDescribedBy: ["footnote-label"]
    },
    children: [{ type: "text", value: String(s) }]
  };
  n.patch(e, a);
  const c = {
    type: "element",
    tagName: "sup",
    properties: {},
    children: [a]
  };
  return n.patch(e, c), n.applyData(e, c);
}
function Zx(n, e) {
  const t = {
    type: "element",
    tagName: "h" + e.depth,
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, t), n.applyData(e, t);
}
function e1(n, e) {
  if (n.options.allowDangerousHtml) {
    const t = { type: "raw", value: e.value };
    return n.patch(e, t), n.applyData(e, t);
  }
}
function Fp(n, e) {
  const t = e.referenceType;
  let r = "]";
  if (t === "collapsed" ? r += "[]" : t === "full" && (r += "[" + (e.label || e.identifier) + "]"), e.type === "imageReference")
    return [{ type: "text", value: "![" + e.alt + r }];
  const i = n.all(e), o = i[0];
  o && o.type === "text" ? o.value = "[" + o.value : i.unshift({ type: "text", value: "[" });
  const s = i[i.length - 1];
  return s && s.type === "text" ? s.value += r : i.push({ type: "text", value: r }), i;
}
function t1(n, e) {
  const t = String(e.identifier).toUpperCase(), r = n.definitionById.get(t);
  if (!r)
    return Fp(n, e);
  const i = { src: ii(r.url || ""), alt: e.alt };
  r.title !== null && r.title !== void 0 && (i.title = r.title);
  const o = { type: "element", tagName: "img", properties: i, children: [] };
  return n.patch(e, o), n.applyData(e, o);
}
function n1(n, e) {
  const t = { src: ii(e.url) };
  e.alt !== null && e.alt !== void 0 && (t.alt = e.alt), e.title !== null && e.title !== void 0 && (t.title = e.title);
  const r = { type: "element", tagName: "img", properties: t, children: [] };
  return n.patch(e, r), n.applyData(e, r);
}
function r1(n, e) {
  const t = { type: "text", value: e.value.replace(/\r?\n|\r/g, " ") };
  n.patch(e, t);
  const r = {
    type: "element",
    tagName: "code",
    properties: {},
    children: [t]
  };
  return n.patch(e, r), n.applyData(e, r);
}
function i1(n, e) {
  const t = String(e.identifier).toUpperCase(), r = n.definitionById.get(t);
  if (!r)
    return Fp(n, e);
  const i = { href: ii(r.url || "") };
  r.title !== null && r.title !== void 0 && (i.title = r.title);
  const o = {
    type: "element",
    tagName: "a",
    properties: i,
    children: n.all(e)
  };
  return n.patch(e, o), n.applyData(e, o);
}
function o1(n, e) {
  const t = { href: ii(e.url) };
  e.title !== null && e.title !== void 0 && (t.title = e.title);
  const r = {
    type: "element",
    tagName: "a",
    properties: t,
    children: n.all(e)
  };
  return n.patch(e, r), n.applyData(e, r);
}
function s1(n, e, t) {
  const r = n.all(e), i = t ? l1(t) : _p(e), o = {}, s = [];
  if (typeof e.checked == "boolean") {
    const u = r[0];
    let d;
    u && u.type === "element" && u.tagName === "p" ? d = u : (d = { type: "element", tagName: "p", properties: {}, children: [] }, r.unshift(d)), d.children.length > 0 && d.children.unshift({ type: "text", value: " " }), d.children.unshift({
      type: "element",
      tagName: "input",
      properties: { type: "checkbox", checked: e.checked, disabled: !0 },
      children: []
    }), o.className = ["task-list-item"];
  }
  let l = -1;
  for (; ++l < r.length; ) {
    const u = r[l];
    (i || l !== 0 || u.type !== "element" || u.tagName !== "p") && s.push({ type: "text", value: `
` }), u.type === "element" && u.tagName === "p" && !i ? s.push(...u.children) : s.push(u);
  }
  const a = r[r.length - 1];
  a && (i || a.type !== "element" || a.tagName !== "p") && s.push({ type: "text", value: `
` });
  const c = { type: "element", tagName: "li", properties: o, children: s };
  return n.patch(e, c), n.applyData(e, c);
}
function l1(n) {
  let e = !1;
  if (n.type === "list") {
    e = n.spread || !1;
    const t = n.children;
    let r = -1;
    for (; !e && ++r < t.length; )
      e = _p(t[r]);
  }
  return e;
}
function _p(n) {
  const e = n.spread;
  return e ?? n.children.length > 1;
}
function a1(n, e) {
  const t = {}, r = n.all(e);
  let i = -1;
  for (typeof e.start == "number" && e.start !== 1 && (t.start = e.start); ++i < r.length; ) {
    const s = r[i];
    if (s.type === "element" && s.tagName === "li" && s.properties && Array.isArray(s.properties.className) && s.properties.className.includes("task-list-item")) {
      t.className = ["contains-task-list"];
      break;
    }
  }
  const o = {
    type: "element",
    tagName: e.ordered ? "ol" : "ul",
    properties: t,
    children: n.wrap(r, !0)
  };
  return n.patch(e, o), n.applyData(e, o);
}
function c1(n, e) {
  const t = {
    type: "element",
    tagName: "p",
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, t), n.applyData(e, t);
}
function u1(n, e) {
  const t = { type: "root", children: n.wrap(n.all(e)) };
  return n.patch(e, t), n.applyData(e, t);
}
function d1(n, e) {
  const t = {
    type: "element",
    tagName: "strong",
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, t), n.applyData(e, t);
}
const Hp = jp("end"), qp = jp("start");
function jp(n) {
  return e;
  function e(t) {
    const r = t && t.position && t.position[n] || {};
    if (typeof r.line == "number" && r.line > 0 && typeof r.column == "number" && r.column > 0)
      return {
        line: r.line,
        column: r.column,
        offset: typeof r.offset == "number" && r.offset > -1 ? r.offset : void 0
      };
  }
}
function h1(n) {
  const e = qp(n), t = Hp(n);
  if (e && t)
    return { start: e, end: t };
}
function f1(n, e) {
  const t = n.all(e), r = t.shift(), i = [];
  if (r) {
    const s = {
      type: "element",
      tagName: "thead",
      properties: {},
      children: n.wrap([r], !0)
    };
    n.patch(e.children[0], s), i.push(s);
  }
  if (t.length > 0) {
    const s = {
      type: "element",
      tagName: "tbody",
      properties: {},
      children: n.wrap(t, !0)
    }, l = qp(e.children[1]), a = Hp(e.children[e.children.length - 1]);
    l && a && (s.position = { start: l, end: a }), i.push(s);
  }
  const o = {
    type: "element",
    tagName: "table",
    properties: {},
    children: n.wrap(i, !0)
  };
  return n.patch(e, o), n.applyData(e, o);
}
function p1(n, e, t) {
  const r = t ? t.children : void 0, o = (r ? r.indexOf(e) : 1) === 0 ? "th" : "td", s = t && t.type === "table" ? t.align : void 0, l = s ? s.length : e.children.length;
  let a = -1;
  const c = [];
  for (; ++a < l; ) {
    const d = e.children[a], h = {}, f = s ? s[a] : void 0;
    f && (h.align = f);
    let p = { type: "element", tagName: o, properties: h, children: [] };
    d && (p.children = n.all(d), n.patch(d, p), p = n.applyData(d, p)), c.push(p);
  }
  const u = {
    type: "element",
    tagName: "tr",
    properties: {},
    children: n.wrap(c, !0)
  };
  return n.patch(e, u), n.applyData(e, u);
}
function m1(n, e) {
  const t = {
    type: "element",
    tagName: "td",
    // Assume body cell.
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, t), n.applyData(e, t);
}
const th = 9, nh = 32;
function g1(n) {
  const e = String(n), t = /\r?\n|\r/g;
  let r = t.exec(e), i = 0;
  const o = [];
  for (; r; )
    o.push(
      rh(e.slice(i, r.index), i > 0, !0),
      r[0]
    ), i = r.index + r[0].length, r = t.exec(e);
  return o.push(rh(e.slice(i), i > 0, !1)), o.join("");
}
function rh(n, e, t) {
  let r = 0, i = n.length;
  if (e) {
    let o = n.codePointAt(r);
    for (; o === th || o === nh; )
      r++, o = n.codePointAt(r);
  }
  if (t) {
    let o = n.codePointAt(i - 1);
    for (; o === th || o === nh; )
      i--, o = n.codePointAt(i - 1);
  }
  return i > r ? n.slice(r, i) : "";
}
function y1(n, e) {
  const t = { type: "text", value: g1(String(e.value)) };
  return n.patch(e, t), n.applyData(e, t);
}
function b1(n, e) {
  const t = {
    type: "element",
    tagName: "hr",
    properties: {},
    children: []
  };
  return n.patch(e, t), n.applyData(e, t);
}
const k1 = {
  blockquote: Kx,
  break: Jx,
  code: Gx,
  delete: Yx,
  emphasis: Xx,
  footnoteReference: Qx,
  heading: Zx,
  html: e1,
  imageReference: t1,
  image: n1,
  inlineCode: r1,
  linkReference: i1,
  link: o1,
  listItem: s1,
  list: a1,
  paragraph: c1,
  // @ts-expect-error: root is different, but hard to type.
  root: u1,
  strong: d1,
  table: f1,
  tableCell: m1,
  tableRow: p1,
  text: y1,
  thematicBreak: b1,
  toml: Uo,
  yaml: Uo,
  definition: Uo,
  footnoteDefinition: Uo
};
function Uo() {
}
const Vp = -1, sl = 0, zi = 1, Ps = 2, Hc = 3, qc = 4, jc = 5, Vc = 6, Up = 7, Wp = 8, ih = typeof self == "object" ? self : globalThis, w1 = (n, e) => {
  const t = (i, o) => (n.set(o, i), i), r = (i) => {
    if (n.has(i))
      return n.get(i);
    const [o, s] = e[i];
    switch (o) {
      case sl:
      case Vp:
        return t(s, i);
      case zi: {
        const l = t([], i);
        for (const a of s)
          l.push(r(a));
        return l;
      }
      case Ps: {
        const l = t({}, i);
        for (const [a, c] of s)
          l[r(a)] = r(c);
        return l;
      }
      case Hc:
        return t(new Date(s), i);
      case qc: {
        const { source: l, flags: a } = s;
        return t(new RegExp(l, a), i);
      }
      case jc: {
        const l = t(/* @__PURE__ */ new Map(), i);
        for (const [a, c] of s)
          l.set(r(a), r(c));
        return l;
      }
      case Vc: {
        const l = t(/* @__PURE__ */ new Set(), i);
        for (const a of s)
          l.add(r(a));
        return l;
      }
      case Up: {
        const { name: l, message: a } = s;
        return t(new ih[l](a), i);
      }
      case Wp:
        return t(BigInt(s), i);
      case "BigInt":
        return t(Object(BigInt(s)), i);
      case "ArrayBuffer":
        return t(new Uint8Array(s).buffer, s);
      case "DataView": {
        const { buffer: l } = new Uint8Array(s);
        return t(new DataView(l), s);
      }
    }
    return t(new ih[o](s), i);
  };
  return r;
}, oh = (n) => w1(/* @__PURE__ */ new Map(), n)(0), kr = "", { toString: C1 } = {}, { keys: S1 } = Object, ki = (n) => {
  const e = typeof n;
  if (e !== "object" || !n)
    return [sl, e];
  const t = C1.call(n).slice(8, -1);
  switch (t) {
    case "Array":
      return [zi, kr];
    case "Object":
      return [Ps, kr];
    case "Date":
      return [Hc, kr];
    case "RegExp":
      return [qc, kr];
    case "Map":
      return [jc, kr];
    case "Set":
      return [Vc, kr];
    case "DataView":
      return [zi, t];
  }
  return t.includes("Array") ? [zi, t] : t.includes("Error") ? [Up, t] : [Ps, t];
}, Wo = ([n, e]) => n === sl && (e === "function" || e === "symbol"), x1 = (n, e, t, r) => {
  const i = (s, l) => {
    const a = r.push(s) - 1;
    return t.set(l, a), a;
  }, o = (s) => {
    if (t.has(s))
      return t.get(s);
    let [l, a] = ki(s);
    switch (l) {
      case sl: {
        let u = s;
        switch (a) {
          case "bigint":
            l = Wp, u = s.toString();
            break;
          case "function":
          case "symbol":
            if (n)
              throw new TypeError("unable to serialize " + a);
            u = null;
            break;
          case "undefined":
            return i([Vp], s);
        }
        return i([l, u], s);
      }
      case zi: {
        if (a) {
          let h = s;
          return a === "DataView" ? h = new Uint8Array(s.buffer) : a === "ArrayBuffer" && (h = new Uint8Array(s)), i([a, [...h]], s);
        }
        const u = [], d = i([l, u], s);
        for (const h of s)
          u.push(o(h));
        return d;
      }
      case Ps: {
        if (a)
          switch (a) {
            case "BigInt":
              return i([a, s.toString()], s);
            case "Boolean":
            case "Number":
            case "String":
              return i([a, s.valueOf()], s);
          }
        if (e && "toJSON" in s)
          return o(s.toJSON());
        const u = [], d = i([l, u], s);
        for (const h of S1(s))
          (n || !Wo(ki(s[h]))) && u.push([o(h), o(s[h])]);
        return d;
      }
      case Hc:
        return i([l, s.toISOString()], s);
      case qc: {
        const { source: u, flags: d } = s;
        return i([l, { source: u, flags: d }], s);
      }
      case jc: {
        const u = [], d = i([l, u], s);
        for (const [h, f] of s)
          (n || !(Wo(ki(h)) || Wo(ki(f)))) && u.push([o(h), o(f)]);
        return d;
      }
      case Vc: {
        const u = [], d = i([l, u], s);
        for (const h of s)
          (n || !Wo(ki(h))) && u.push(o(h));
        return d;
      }
    }
    const { message: c } = s;
    return i([l, { name: a, message: c }], s);
  };
  return o;
}, sh = (n, { json: e, lossy: t } = {}) => {
  const r = [];
  return x1(!(e || t), !!e, /* @__PURE__ */ new Map(), r)(n), r;
}, Bs = typeof structuredClone == "function" ? (
  /* c8 ignore start */
  (n, e) => e && ("json" in e || "lossy" in e) ? oh(sh(n, e)) : structuredClone(n)
) : (n, e) => oh(sh(n, e));
function v1(n, e) {
  const t = [{ type: "text", value: "↩" }];
  return e > 1 && t.push({
    type: "element",
    tagName: "sup",
    properties: {},
    children: [{ type: "text", value: String(e) }]
  }), t;
}
function E1(n, e) {
  return "Back to reference " + (n + 1) + (e > 1 ? "-" + e : "");
}
function M1(n) {
  const e = typeof n.options.clobberPrefix == "string" ? n.options.clobberPrefix : "user-content-", t = n.options.footnoteBackContent || v1, r = n.options.footnoteBackLabel || E1, i = n.options.footnoteLabel || "Footnotes", o = n.options.footnoteLabelTagName || "h2", s = n.options.footnoteLabelProperties || {
    className: ["sr-only"]
  }, l = [];
  let a = -1;
  for (; ++a < n.footnoteOrder.length; ) {
    const c = n.footnoteById.get(
      n.footnoteOrder[a]
    );
    if (!c)
      continue;
    const u = n.all(c), d = String(c.identifier).toUpperCase(), h = ii(d.toLowerCase());
    let f = 0;
    const p = [], m = n.footnoteCounts.get(d);
    for (; m !== void 0 && ++f <= m; ) {
      p.length > 0 && p.push({ type: "text", value: " " });
      let C = typeof t == "string" ? t : t(a, f);
      typeof C == "string" && (C = { type: "text", value: C }), p.push({
        type: "element",
        tagName: "a",
        properties: {
          href: "#" + e + "fnref-" + h + (f > 1 ? "-" + f : ""),
          dataFootnoteBackref: "",
          ariaLabel: typeof r == "string" ? r : r(a, f),
          className: ["data-footnote-backref"]
        },
        children: Array.isArray(C) ? C : [C]
      });
    }
    const y = u[u.length - 1];
    if (y && y.type === "element" && y.tagName === "p") {
      const C = y.children[y.children.length - 1];
      C && C.type === "text" ? C.value += " " : y.children.push({ type: "text", value: " " }), y.children.push(...p);
    } else
      u.push(...p);
    const g = {
      type: "element",
      tagName: "li",
      properties: { id: e + "fn-" + h },
      children: n.wrap(u, !0)
    };
    n.patch(c, g), l.push(g);
  }
  if (l.length !== 0)
    return {
      type: "element",
      tagName: "section",
      properties: { dataFootnotes: !0, className: ["footnotes"] },
      children: [
        {
          type: "element",
          tagName: o,
          properties: {
            ...Bs(s),
            id: "footnote-label"
          },
          children: [{ type: "text", value: i }]
        },
        { type: "text", value: `
` },
        {
          type: "element",
          tagName: "ol",
          properties: {},
          children: n.wrap(l, !0)
        },
        { type: "text", value: `
` }
      ]
    };
}
const Ua = {}.hasOwnProperty, T1 = {};
function N1(n, e) {
  const t = e || T1, r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = { ...k1, ...t.handlers }, l = {
    all: c,
    applyData: A1,
    definitionById: r,
    footnoteById: i,
    footnoteCounts: o,
    footnoteOrder: [],
    handlers: s,
    one: a,
    options: t,
    patch: I1,
    wrap: R1
  };
  return rn(n, function(u) {
    if (u.type === "definition" || u.type === "footnoteDefinition") {
      const d = u.type === "definition" ? r : i, h = String(u.identifier).toUpperCase();
      d.has(h) || d.set(h, u);
    }
  }), l;
  function a(u, d) {
    const h = u.type, f = l.handlers[h];
    if (Ua.call(l.handlers, h) && f)
      return f(l, u, d);
    if (l.options.passThrough && l.options.passThrough.includes(h)) {
      if ("children" in u) {
        const { children: m, ...y } = u, g = Bs(y);
        return g.children = l.all(u), g;
      }
      return Bs(u);
    }
    return (l.options.unknownHandler || O1)(l, u, d);
  }
  function c(u) {
    const d = [];
    if ("children" in u) {
      const h = u.children;
      let f = -1;
      for (; ++f < h.length; ) {
        const p = l.one(h[f], u);
        if (p) {
          if (f && h[f - 1].type === "break" && (!Array.isArray(p) && p.type === "text" && (p.value = lh(p.value)), !Array.isArray(p) && p.type === "element")) {
            const m = p.children[0];
            m && m.type === "text" && (m.value = lh(m.value));
          }
          Array.isArray(p) ? d.push(...p) : d.push(p);
        }
      }
    }
    return d;
  }
}
function I1(n, e) {
  n.position && (e.position = h1(n));
}
function A1(n, e) {
  let t = e;
  if (n && n.data) {
    const r = n.data.hName, i = n.data.hChildren, o = n.data.hProperties;
    if (typeof r == "string")
      if (t.type === "element")
        t.tagName = r;
      else {
        const s = "children" in t ? t.children : [t];
        t = { type: "element", tagName: r, properties: {}, children: s };
      }
    t.type === "element" && o && Object.assign(t.properties, Bs(o)), "children" in t && t.children && i !== null && i !== void 0 && (t.children = i);
  }
  return t;
}
function O1(n, e) {
  const t = e.data || {}, r = "value" in e && !(Ua.call(t, "hProperties") || Ua.call(t, "hChildren")) ? { type: "text", value: e.value } : {
    type: "element",
    tagName: "div",
    properties: {},
    children: n.all(e)
  };
  return n.patch(e, r), n.applyData(e, r);
}
function R1(n, e) {
  const t = [];
  let r = -1;
  for (e && t.push({ type: "text", value: `
` }); ++r < n.length; )
    r && t.push({ type: "text", value: `
` }), t.push(n[r]);
  return e && n.length > 0 && t.push({ type: "text", value: `
` }), t;
}
function lh(n) {
  let e = 0, t = n.charCodeAt(e);
  for (; t === 9 || t === 32; )
    e++, t = n.charCodeAt(e);
  return n.slice(e);
}
function ah(n, e) {
  const t = N1(n, e), r = t.one(n, void 0), i = M1(t), o = Array.isArray(r) ? { type: "root", children: r } : r || { type: "root", children: [] };
  return i && o.children.push({ type: "text", value: `
` }, i), o;
}
function D1(n, e) {
  return n && "run" in n ? async function(t, r) {
    const i = (
      /** @type {HastRoot} */
      ah(t, { file: r, ...e })
    );
    await n.run(i, r);
  } : function(t, r) {
    return (
      /** @type {HastRoot} */
      ah(t, { file: r, ...n || e })
    );
  };
}
const L1 = [
  "area",
  "base",
  "basefont",
  "bgsound",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "image",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
];
let vo = class {
  /**
   * @param {SchemaType['property']} property
   *   Property.
   * @param {SchemaType['normal']} normal
   *   Normal.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Schema.
   */
  constructor(e, t, r) {
    this.normal = t, this.property = e, r && (this.space = r);
  }
};
vo.prototype.normal = {};
vo.prototype.property = {};
vo.prototype.space = void 0;
function Kp(n, e) {
  const t = {}, r = {};
  for (const i of n)
    Object.assign(t, i.property), Object.assign(r, i.normal);
  return new vo(t, r, e);
}
function Wa(n) {
  return n.toLowerCase();
}
class Ke {
  /**
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @returns
   *   Info.
   */
  constructor(e, t) {
    this.attribute = t, this.property = e;
  }
}
Ke.prototype.attribute = "";
Ke.prototype.booleanish = !1;
Ke.prototype.boolean = !1;
Ke.prototype.commaOrSpaceSeparated = !1;
Ke.prototype.commaSeparated = !1;
Ke.prototype.defined = !1;
Ke.prototype.mustUseProperty = !1;
Ke.prototype.number = !1;
Ke.prototype.overloadedBoolean = !1;
Ke.prototype.property = "";
Ke.prototype.spaceSeparated = !1;
Ke.prototype.space = void 0;
let P1 = 0;
const K = hr(), he = hr(), Ka = hr(), I = hr(), ae = hr(), Dr = hr(), Ye = hr();
function hr() {
  return 2 ** ++P1;
}
const Ja = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  boolean: K,
  booleanish: he,
  commaOrSpaceSeparated: Ye,
  commaSeparated: Dr,
  number: I,
  overloadedBoolean: Ka,
  spaceSeparated: ae
}, Symbol.toStringTag, { value: "Module" })), Kl = (
  /** @type {ReadonlyArray<keyof typeof types>} */
  Object.keys(Ja)
);
class Uc extends Ke {
  /**
   * @constructor
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @param {number | null | undefined} [mask]
   *   Mask.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Info.
   */
  constructor(e, t, r, i) {
    let o = -1;
    if (super(e, t), ch(this, "space", i), typeof r == "number")
      for (; ++o < Kl.length; ) {
        const s = Kl[o];
        ch(this, Kl[o], (r & Ja[s]) === Ja[s]);
      }
  }
}
Uc.prototype.defined = !0;
function ch(n, e, t) {
  t && (n[e] = t);
}
function oi(n) {
  const e = {}, t = {};
  for (const [r, i] of Object.entries(n.properties)) {
    const o = new Uc(
      r,
      n.transform(n.attributes || {}, r),
      i,
      n.space
    );
    n.mustUseProperty && n.mustUseProperty.includes(r) && (o.mustUseProperty = !0), e[r] = o, t[Wa(r)] = r, t[Wa(o.attribute)] = r;
  }
  return new vo(e, t, n.space);
}
const Jp = oi({
  properties: {
    ariaActiveDescendant: null,
    ariaAtomic: he,
    ariaAutoComplete: null,
    ariaBusy: he,
    ariaChecked: he,
    ariaColCount: I,
    ariaColIndex: I,
    ariaColSpan: I,
    ariaControls: ae,
    ariaCurrent: null,
    ariaDescribedBy: ae,
    ariaDetails: null,
    ariaDisabled: he,
    ariaDropEffect: ae,
    ariaErrorMessage: null,
    ariaExpanded: he,
    ariaFlowTo: ae,
    ariaGrabbed: he,
    ariaHasPopup: null,
    ariaHidden: he,
    ariaInvalid: null,
    ariaKeyShortcuts: null,
    ariaLabel: null,
    ariaLabelledBy: ae,
    ariaLevel: I,
    ariaLive: null,
    ariaModal: he,
    ariaMultiLine: he,
    ariaMultiSelectable: he,
    ariaOrientation: null,
    ariaOwns: ae,
    ariaPlaceholder: null,
    ariaPosInSet: I,
    ariaPressed: he,
    ariaReadOnly: he,
    ariaRelevant: null,
    ariaRequired: he,
    ariaRoleDescription: ae,
    ariaRowCount: I,
    ariaRowIndex: I,
    ariaRowSpan: I,
    ariaSelected: he,
    ariaSetSize: I,
    ariaSort: null,
    ariaValueMax: I,
    ariaValueMin: I,
    ariaValueNow: I,
    ariaValueText: null,
    role: null
  },
  transform(n, e) {
    return e === "role" ? e : "aria-" + e.slice(4).toLowerCase();
  }
});
function Gp(n, e) {
  return e in n ? n[e] : e;
}
function Yp(n, e) {
  return Gp(n, e.toLowerCase());
}
const B1 = oi({
  attributes: {
    acceptcharset: "accept-charset",
    classname: "class",
    htmlfor: "for",
    httpequiv: "http-equiv"
  },
  mustUseProperty: ["checked", "multiple", "muted", "selected"],
  properties: {
    // Standard Properties.
    abbr: null,
    accept: Dr,
    acceptCharset: ae,
    accessKey: ae,
    action: null,
    allow: null,
    allowFullScreen: K,
    allowPaymentRequest: K,
    allowUserMedia: K,
    alt: null,
    as: null,
    async: K,
    autoCapitalize: null,
    autoComplete: ae,
    autoFocus: K,
    autoPlay: K,
    blocking: ae,
    capture: null,
    charSet: null,
    checked: K,
    cite: null,
    className: ae,
    cols: I,
    colSpan: null,
    content: null,
    contentEditable: he,
    controls: K,
    controlsList: ae,
    coords: I | Dr,
    crossOrigin: null,
    data: null,
    dateTime: null,
    decoding: null,
    default: K,
    defer: K,
    dir: null,
    dirName: null,
    disabled: K,
    download: Ka,
    draggable: he,
    encType: null,
    enterKeyHint: null,
    fetchPriority: null,
    form: null,
    formAction: null,
    formEncType: null,
    formMethod: null,
    formNoValidate: K,
    formTarget: null,
    headers: ae,
    height: I,
    hidden: Ka,
    high: I,
    href: null,
    hrefLang: null,
    htmlFor: ae,
    httpEquiv: ae,
    id: null,
    imageSizes: null,
    imageSrcSet: null,
    inert: K,
    inputMode: null,
    integrity: null,
    is: null,
    isMap: K,
    itemId: null,
    itemProp: ae,
    itemRef: ae,
    itemScope: K,
    itemType: ae,
    kind: null,
    label: null,
    lang: null,
    language: null,
    list: null,
    loading: null,
    loop: K,
    low: I,
    manifest: null,
    max: null,
    maxLength: I,
    media: null,
    method: null,
    min: null,
    minLength: I,
    multiple: K,
    muted: K,
    name: null,
    nonce: null,
    noModule: K,
    noValidate: K,
    onAbort: null,
    onAfterPrint: null,
    onAuxClick: null,
    onBeforeMatch: null,
    onBeforePrint: null,
    onBeforeToggle: null,
    onBeforeUnload: null,
    onBlur: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onContextLost: null,
    onContextMenu: null,
    onContextRestored: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFormData: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLanguageChange: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadEnd: null,
    onLoadStart: null,
    onMessage: null,
    onMessageError: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRejectionHandled: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onScrollEnd: null,
    onSecurityPolicyViolation: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onSlotChange: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnhandledRejection: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onWheel: null,
    open: K,
    optimum: I,
    pattern: null,
    ping: ae,
    placeholder: null,
    playsInline: K,
    popover: null,
    popoverTarget: null,
    popoverTargetAction: null,
    poster: null,
    preload: null,
    readOnly: K,
    referrerPolicy: null,
    rel: ae,
    required: K,
    reversed: K,
    rows: I,
    rowSpan: I,
    sandbox: ae,
    scope: null,
    scoped: K,
    seamless: K,
    selected: K,
    shadowRootClonable: K,
    shadowRootDelegatesFocus: K,
    shadowRootMode: null,
    shape: null,
    size: I,
    sizes: null,
    slot: null,
    span: I,
    spellCheck: he,
    src: null,
    srcDoc: null,
    srcLang: null,
    srcSet: null,
    start: I,
    step: null,
    style: null,
    tabIndex: I,
    target: null,
    title: null,
    translate: null,
    type: null,
    typeMustMatch: K,
    useMap: null,
    value: he,
    width: I,
    wrap: null,
    writingSuggestions: null,
    // Legacy.
    // See: https://html.spec.whatwg.org/#other-elements,-attributes-and-apis
    align: null,
    // Several. Use CSS `text-align` instead,
    aLink: null,
    // `<body>`. Use CSS `a:active {color}` instead
    archive: ae,
    // `<object>`. List of URIs to archives
    axis: null,
    // `<td>` and `<th>`. Use `scope` on `<th>`
    background: null,
    // `<body>`. Use CSS `background-image` instead
    bgColor: null,
    // `<body>` and table elements. Use CSS `background-color` instead
    border: I,
    // `<table>`. Use CSS `border-width` instead,
    borderColor: null,
    // `<table>`. Use CSS `border-color` instead,
    bottomMargin: I,
    // `<body>`
    cellPadding: null,
    // `<table>`
    cellSpacing: null,
    // `<table>`
    char: null,
    // Several table elements. When `align=char`, sets the character to align on
    charOff: null,
    // Several table elements. When `char`, offsets the alignment
    classId: null,
    // `<object>`
    clear: null,
    // `<br>`. Use CSS `clear` instead
    code: null,
    // `<object>`
    codeBase: null,
    // `<object>`
    codeType: null,
    // `<object>`
    color: null,
    // `<font>` and `<hr>`. Use CSS instead
    compact: K,
    // Lists. Use CSS to reduce space between items instead
    declare: K,
    // `<object>`
    event: null,
    // `<script>`
    face: null,
    // `<font>`. Use CSS instead
    frame: null,
    // `<table>`
    frameBorder: null,
    // `<iframe>`. Use CSS `border` instead
    hSpace: I,
    // `<img>` and `<object>`
    leftMargin: I,
    // `<body>`
    link: null,
    // `<body>`. Use CSS `a:link {color: *}` instead
    longDesc: null,
    // `<frame>`, `<iframe>`, and `<img>`. Use an `<a>`
    lowSrc: null,
    // `<img>`. Use a `<picture>`
    marginHeight: I,
    // `<body>`
    marginWidth: I,
    // `<body>`
    noResize: K,
    // `<frame>`
    noHref: K,
    // `<area>`. Use no href instead of an explicit `nohref`
    noShade: K,
    // `<hr>`. Use background-color and height instead of borders
    noWrap: K,
    // `<td>` and `<th>`
    object: null,
    // `<applet>`
    profile: null,
    // `<head>`
    prompt: null,
    // `<isindex>`
    rev: null,
    // `<link>`
    rightMargin: I,
    // `<body>`
    rules: null,
    // `<table>`
    scheme: null,
    // `<meta>`
    scrolling: he,
    // `<frame>`. Use overflow in the child context
    standby: null,
    // `<object>`
    summary: null,
    // `<table>`
    text: null,
    // `<body>`. Use CSS `color` instead
    topMargin: I,
    // `<body>`
    valueType: null,
    // `<param>`
    version: null,
    // `<html>`. Use a doctype.
    vAlign: null,
    // Several. Use CSS `vertical-align` instead
    vLink: null,
    // `<body>`. Use CSS `a:visited {color}` instead
    vSpace: I,
    // `<img>` and `<object>`
    // Non-standard Properties.
    allowTransparency: null,
    autoCorrect: null,
    autoSave: null,
    disablePictureInPicture: K,
    disableRemotePlayback: K,
    prefix: null,
    property: null,
    results: I,
    security: null,
    unselectable: null
  },
  space: "html",
  transform: Yp
}), $1 = oi({
  attributes: {
    accentHeight: "accent-height",
    alignmentBaseline: "alignment-baseline",
    arabicForm: "arabic-form",
    baselineShift: "baseline-shift",
    capHeight: "cap-height",
    className: "class",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    colorInterpolation: "color-interpolation",
    colorInterpolationFilters: "color-interpolation-filters",
    colorProfile: "color-profile",
    colorRendering: "color-rendering",
    crossOrigin: "crossorigin",
    dataType: "datatype",
    dominantBaseline: "dominant-baseline",
    enableBackground: "enable-background",
    fillOpacity: "fill-opacity",
    fillRule: "fill-rule",
    floodColor: "flood-color",
    floodOpacity: "flood-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontSizeAdjust: "font-size-adjust",
    fontStretch: "font-stretch",
    fontStyle: "font-style",
    fontVariant: "font-variant",
    fontWeight: "font-weight",
    glyphName: "glyph-name",
    glyphOrientationHorizontal: "glyph-orientation-horizontal",
    glyphOrientationVertical: "glyph-orientation-vertical",
    hrefLang: "hreflang",
    horizAdvX: "horiz-adv-x",
    horizOriginX: "horiz-origin-x",
    horizOriginY: "horiz-origin-y",
    imageRendering: "image-rendering",
    letterSpacing: "letter-spacing",
    lightingColor: "lighting-color",
    markerEnd: "marker-end",
    markerMid: "marker-mid",
    markerStart: "marker-start",
    navDown: "nav-down",
    navDownLeft: "nav-down-left",
    navDownRight: "nav-down-right",
    navLeft: "nav-left",
    navNext: "nav-next",
    navPrev: "nav-prev",
    navRight: "nav-right",
    navUp: "nav-up",
    navUpLeft: "nav-up-left",
    navUpRight: "nav-up-right",
    onAbort: "onabort",
    onActivate: "onactivate",
    onAfterPrint: "onafterprint",
    onBeforePrint: "onbeforeprint",
    onBegin: "onbegin",
    onCancel: "oncancel",
    onCanPlay: "oncanplay",
    onCanPlayThrough: "oncanplaythrough",
    onChange: "onchange",
    onClick: "onclick",
    onClose: "onclose",
    onCopy: "oncopy",
    onCueChange: "oncuechange",
    onCut: "oncut",
    onDblClick: "ondblclick",
    onDrag: "ondrag",
    onDragEnd: "ondragend",
    onDragEnter: "ondragenter",
    onDragExit: "ondragexit",
    onDragLeave: "ondragleave",
    onDragOver: "ondragover",
    onDragStart: "ondragstart",
    onDrop: "ondrop",
    onDurationChange: "ondurationchange",
    onEmptied: "onemptied",
    onEnd: "onend",
    onEnded: "onended",
    onError: "onerror",
    onFocus: "onfocus",
    onFocusIn: "onfocusin",
    onFocusOut: "onfocusout",
    onHashChange: "onhashchange",
    onInput: "oninput",
    onInvalid: "oninvalid",
    onKeyDown: "onkeydown",
    onKeyPress: "onkeypress",
    onKeyUp: "onkeyup",
    onLoad: "onload",
    onLoadedData: "onloadeddata",
    onLoadedMetadata: "onloadedmetadata",
    onLoadStart: "onloadstart",
    onMessage: "onmessage",
    onMouseDown: "onmousedown",
    onMouseEnter: "onmouseenter",
    onMouseLeave: "onmouseleave",
    onMouseMove: "onmousemove",
    onMouseOut: "onmouseout",
    onMouseOver: "onmouseover",
    onMouseUp: "onmouseup",
    onMouseWheel: "onmousewheel",
    onOffline: "onoffline",
    onOnline: "ononline",
    onPageHide: "onpagehide",
    onPageShow: "onpageshow",
    onPaste: "onpaste",
    onPause: "onpause",
    onPlay: "onplay",
    onPlaying: "onplaying",
    onPopState: "onpopstate",
    onProgress: "onprogress",
    onRateChange: "onratechange",
    onRepeat: "onrepeat",
    onReset: "onreset",
    onResize: "onresize",
    onScroll: "onscroll",
    onSeeked: "onseeked",
    onSeeking: "onseeking",
    onSelect: "onselect",
    onShow: "onshow",
    onStalled: "onstalled",
    onStorage: "onstorage",
    onSubmit: "onsubmit",
    onSuspend: "onsuspend",
    onTimeUpdate: "ontimeupdate",
    onToggle: "ontoggle",
    onUnload: "onunload",
    onVolumeChange: "onvolumechange",
    onWaiting: "onwaiting",
    onZoom: "onzoom",
    overlinePosition: "overline-position",
    overlineThickness: "overline-thickness",
    paintOrder: "paint-order",
    panose1: "panose-1",
    pointerEvents: "pointer-events",
    referrerPolicy: "referrerpolicy",
    renderingIntent: "rendering-intent",
    shapeRendering: "shape-rendering",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    strikethroughPosition: "strikethrough-position",
    strikethroughThickness: "strikethrough-thickness",
    strokeDashArray: "stroke-dasharray",
    strokeDashOffset: "stroke-dashoffset",
    strokeLineCap: "stroke-linecap",
    strokeLineJoin: "stroke-linejoin",
    strokeMiterLimit: "stroke-miterlimit",
    strokeOpacity: "stroke-opacity",
    strokeWidth: "stroke-width",
    tabIndex: "tabindex",
    textAnchor: "text-anchor",
    textDecoration: "text-decoration",
    textRendering: "text-rendering",
    transformOrigin: "transform-origin",
    typeOf: "typeof",
    underlinePosition: "underline-position",
    underlineThickness: "underline-thickness",
    unicodeBidi: "unicode-bidi",
    unicodeRange: "unicode-range",
    unitsPerEm: "units-per-em",
    vAlphabetic: "v-alphabetic",
    vHanging: "v-hanging",
    vIdeographic: "v-ideographic",
    vMathematical: "v-mathematical",
    vectorEffect: "vector-effect",
    vertAdvY: "vert-adv-y",
    vertOriginX: "vert-origin-x",
    vertOriginY: "vert-origin-y",
    wordSpacing: "word-spacing",
    writingMode: "writing-mode",
    xHeight: "x-height",
    // These were camelcased in Tiny. Now lowercased in SVG 2
    playbackOrder: "playbackorder",
    timelineBegin: "timelinebegin"
  },
  properties: {
    about: Ye,
    accentHeight: I,
    accumulate: null,
    additive: null,
    alignmentBaseline: null,
    alphabetic: I,
    amplitude: I,
    arabicForm: null,
    ascent: I,
    attributeName: null,
    attributeType: null,
    azimuth: I,
    bandwidth: null,
    baselineShift: null,
    baseFrequency: null,
    baseProfile: null,
    bbox: null,
    begin: null,
    bias: I,
    by: null,
    calcMode: null,
    capHeight: I,
    className: ae,
    clip: null,
    clipPath: null,
    clipPathUnits: null,
    clipRule: null,
    color: null,
    colorInterpolation: null,
    colorInterpolationFilters: null,
    colorProfile: null,
    colorRendering: null,
    content: null,
    contentScriptType: null,
    contentStyleType: null,
    crossOrigin: null,
    cursor: null,
    cx: null,
    cy: null,
    d: null,
    dataType: null,
    defaultAction: null,
    descent: I,
    diffuseConstant: I,
    direction: null,
    display: null,
    dur: null,
    divisor: I,
    dominantBaseline: null,
    download: K,
    dx: null,
    dy: null,
    edgeMode: null,
    editable: null,
    elevation: I,
    enableBackground: null,
    end: null,
    event: null,
    exponent: I,
    externalResourcesRequired: null,
    fill: null,
    fillOpacity: I,
    fillRule: null,
    filter: null,
    filterRes: null,
    filterUnits: null,
    floodColor: null,
    floodOpacity: null,
    focusable: null,
    focusHighlight: null,
    fontFamily: null,
    fontSize: null,
    fontSizeAdjust: null,
    fontStretch: null,
    fontStyle: null,
    fontVariant: null,
    fontWeight: null,
    format: null,
    fr: null,
    from: null,
    fx: null,
    fy: null,
    g1: Dr,
    g2: Dr,
    glyphName: Dr,
    glyphOrientationHorizontal: null,
    glyphOrientationVertical: null,
    glyphRef: null,
    gradientTransform: null,
    gradientUnits: null,
    handler: null,
    hanging: I,
    hatchContentUnits: null,
    hatchUnits: null,
    height: null,
    href: null,
    hrefLang: null,
    horizAdvX: I,
    horizOriginX: I,
    horizOriginY: I,
    id: null,
    ideographic: I,
    imageRendering: null,
    initialVisibility: null,
    in: null,
    in2: null,
    intercept: I,
    k: I,
    k1: I,
    k2: I,
    k3: I,
    k4: I,
    kernelMatrix: Ye,
    kernelUnitLength: null,
    keyPoints: null,
    // SEMI_COLON_SEPARATED
    keySplines: null,
    // SEMI_COLON_SEPARATED
    keyTimes: null,
    // SEMI_COLON_SEPARATED
    kerning: null,
    lang: null,
    lengthAdjust: null,
    letterSpacing: null,
    lightingColor: null,
    limitingConeAngle: I,
    local: null,
    markerEnd: null,
    markerMid: null,
    markerStart: null,
    markerHeight: null,
    markerUnits: null,
    markerWidth: null,
    mask: null,
    maskContentUnits: null,
    maskUnits: null,
    mathematical: null,
    max: null,
    media: null,
    mediaCharacterEncoding: null,
    mediaContentEncodings: null,
    mediaSize: I,
    mediaTime: null,
    method: null,
    min: null,
    mode: null,
    name: null,
    navDown: null,
    navDownLeft: null,
    navDownRight: null,
    navLeft: null,
    navNext: null,
    navPrev: null,
    navRight: null,
    navUp: null,
    navUpLeft: null,
    navUpRight: null,
    numOctaves: null,
    observer: null,
    offset: null,
    onAbort: null,
    onActivate: null,
    onAfterPrint: null,
    onBeforePrint: null,
    onBegin: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnd: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFocusIn: null,
    onFocusOut: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadStart: null,
    onMessage: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onMouseWheel: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRepeat: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onShow: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onZoom: null,
    opacity: null,
    operator: null,
    order: null,
    orient: null,
    orientation: null,
    origin: null,
    overflow: null,
    overlay: null,
    overlinePosition: I,
    overlineThickness: I,
    paintOrder: null,
    panose1: null,
    path: null,
    pathLength: I,
    patternContentUnits: null,
    patternTransform: null,
    patternUnits: null,
    phase: null,
    ping: ae,
    pitch: null,
    playbackOrder: null,
    pointerEvents: null,
    points: null,
    pointsAtX: I,
    pointsAtY: I,
    pointsAtZ: I,
    preserveAlpha: null,
    preserveAspectRatio: null,
    primitiveUnits: null,
    propagate: null,
    property: Ye,
    r: null,
    radius: null,
    referrerPolicy: null,
    refX: null,
    refY: null,
    rel: Ye,
    rev: Ye,
    renderingIntent: null,
    repeatCount: null,
    repeatDur: null,
    requiredExtensions: Ye,
    requiredFeatures: Ye,
    requiredFonts: Ye,
    requiredFormats: Ye,
    resource: null,
    restart: null,
    result: null,
    rotate: null,
    rx: null,
    ry: null,
    scale: null,
    seed: null,
    shapeRendering: null,
    side: null,
    slope: null,
    snapshotTime: null,
    specularConstant: I,
    specularExponent: I,
    spreadMethod: null,
    spacing: null,
    startOffset: null,
    stdDeviation: null,
    stemh: null,
    stemv: null,
    stitchTiles: null,
    stopColor: null,
    stopOpacity: null,
    strikethroughPosition: I,
    strikethroughThickness: I,
    string: null,
    stroke: null,
    strokeDashArray: Ye,
    strokeDashOffset: null,
    strokeLineCap: null,
    strokeLineJoin: null,
    strokeMiterLimit: I,
    strokeOpacity: I,
    strokeWidth: null,
    style: null,
    surfaceScale: I,
    syncBehavior: null,
    syncBehaviorDefault: null,
    syncMaster: null,
    syncTolerance: null,
    syncToleranceDefault: null,
    systemLanguage: Ye,
    tabIndex: I,
    tableValues: null,
    target: null,
    targetX: I,
    targetY: I,
    textAnchor: null,
    textDecoration: null,
    textRendering: null,
    textLength: null,
    timelineBegin: null,
    title: null,
    transformBehavior: null,
    type: null,
    typeOf: Ye,
    to: null,
    transform: null,
    transformOrigin: null,
    u1: null,
    u2: null,
    underlinePosition: I,
    underlineThickness: I,
    unicode: null,
    unicodeBidi: null,
    unicodeRange: null,
    unitsPerEm: I,
    values: null,
    vAlphabetic: I,
    vMathematical: I,
    vectorEffect: null,
    vHanging: I,
    vIdeographic: I,
    version: null,
    vertAdvY: I,
    vertOriginX: I,
    vertOriginY: I,
    viewBox: null,
    viewTarget: null,
    visibility: null,
    width: null,
    widths: null,
    wordSpacing: null,
    writingMode: null,
    x: null,
    x1: null,
    x2: null,
    xChannelSelector: null,
    xHeight: I,
    y: null,
    y1: null,
    y2: null,
    yChannelSelector: null,
    z: null,
    zoomAndPan: null
  },
  space: "svg",
  transform: Gp
}), Xp = oi({
  properties: {
    xLinkActuate: null,
    xLinkArcRole: null,
    xLinkHref: null,
    xLinkRole: null,
    xLinkShow: null,
    xLinkTitle: null,
    xLinkType: null
  },
  space: "xlink",
  transform(n, e) {
    return "xlink:" + e.slice(5).toLowerCase();
  }
}), Qp = oi({
  attributes: { xmlnsxlink: "xmlns:xlink" },
  properties: { xmlnsXLink: null, xmlns: null },
  space: "xmlns",
  transform: Yp
}), Zp = oi({
  properties: { xmlBase: null, xmlLang: null, xmlSpace: null },
  space: "xml",
  transform(n, e) {
    return "xml:" + e.slice(3).toLowerCase();
  }
}), z1 = /[A-Z]/g, uh = /-[a-z]/g, F1 = /^data[-\w.:]+$/i;
function _1(n, e) {
  const t = Wa(e);
  let r = e, i = Ke;
  if (t in n.normal)
    return n.property[n.normal[t]];
  if (t.length > 4 && t.slice(0, 4) === "data" && F1.test(e)) {
    if (e.charAt(4) === "-") {
      const o = e.slice(5).replace(uh, q1);
      r = "data" + o.charAt(0).toUpperCase() + o.slice(1);
    } else {
      const o = e.slice(4);
      if (!uh.test(o)) {
        let s = o.replace(z1, H1);
        s.charAt(0) !== "-" && (s = "-" + s), e = "data" + s;
      }
    }
    i = Uc;
  }
  return new i(r, e);
}
function H1(n) {
  return "-" + n.toLowerCase();
}
function q1(n) {
  return n.charAt(1).toUpperCase();
}
const j1 = Kp([Jp, B1, Xp, Qp, Zp], "html"), em = Kp([Jp, $1, Xp, Qp, Zp], "svg"), V1 = /["&'<>`]/g, U1 = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g, W1 = (
  // eslint-disable-next-line no-control-regex, unicorn/no-hex-escape
  /[\x01-\t\v\f\x0E-\x1F\x7F\x81\x8D\x8F\x90\x9D\xA0-\uFFFF]/g
), K1 = /[|\\{}()[\]^$+*?.]/g, dh = /* @__PURE__ */ new WeakMap();
function J1(n, e) {
  if (n = n.replace(
    e.subset ? G1(e.subset) : V1,
    r
  ), e.subset || e.escapeOnly)
    return n;
  return n.replace(U1, t).replace(W1, r);
  function t(i, o, s) {
    return e.format(
      (i.charCodeAt(0) - 55296) * 1024 + i.charCodeAt(1) - 56320 + 65536,
      s.charCodeAt(o + 2),
      e
    );
  }
  function r(i, o, s) {
    return e.format(
      i.charCodeAt(0),
      s.charCodeAt(o + 1),
      e
    );
  }
}
function G1(n) {
  let e = dh.get(n);
  return e || (e = Y1(n), dh.set(n, e)), e;
}
function Y1(n) {
  const e = [];
  let t = -1;
  for (; ++t < n.length; )
    e.push(n[t].replace(K1, "\\$&"));
  return new RegExp("(?:" + e.join("|") + ")", "g");
}
const X1 = /[\dA-Fa-f]/;
function Q1(n, e, t) {
  const r = "&#x" + n.toString(16).toUpperCase();
  return t && e && !X1.test(String.fromCharCode(e)) ? r : r + ";";
}
const Z1 = /\d/;
function e0(n, e, t) {
  const r = "&#" + String(n);
  return t && e && !Z1.test(String.fromCharCode(e)) ? r : r + ";";
}
const t0 = [
  "AElig",
  "AMP",
  "Aacute",
  "Acirc",
  "Agrave",
  "Aring",
  "Atilde",
  "Auml",
  "COPY",
  "Ccedil",
  "ETH",
  "Eacute",
  "Ecirc",
  "Egrave",
  "Euml",
  "GT",
  "Iacute",
  "Icirc",
  "Igrave",
  "Iuml",
  "LT",
  "Ntilde",
  "Oacute",
  "Ocirc",
  "Ograve",
  "Oslash",
  "Otilde",
  "Ouml",
  "QUOT",
  "REG",
  "THORN",
  "Uacute",
  "Ucirc",
  "Ugrave",
  "Uuml",
  "Yacute",
  "aacute",
  "acirc",
  "acute",
  "aelig",
  "agrave",
  "amp",
  "aring",
  "atilde",
  "auml",
  "brvbar",
  "ccedil",
  "cedil",
  "cent",
  "copy",
  "curren",
  "deg",
  "divide",
  "eacute",
  "ecirc",
  "egrave",
  "eth",
  "euml",
  "frac12",
  "frac14",
  "frac34",
  "gt",
  "iacute",
  "icirc",
  "iexcl",
  "igrave",
  "iquest",
  "iuml",
  "laquo",
  "lt",
  "macr",
  "micro",
  "middot",
  "nbsp",
  "not",
  "ntilde",
  "oacute",
  "ocirc",
  "ograve",
  "ordf",
  "ordm",
  "oslash",
  "otilde",
  "ouml",
  "para",
  "plusmn",
  "pound",
  "quot",
  "raquo",
  "reg",
  "sect",
  "shy",
  "sup1",
  "sup2",
  "sup3",
  "szlig",
  "thorn",
  "times",
  "uacute",
  "ucirc",
  "ugrave",
  "uml",
  "uuml",
  "yacute",
  "yen",
  "yuml"
], Jl = {
  nbsp: " ",
  iexcl: "¡",
  cent: "¢",
  pound: "£",
  curren: "¤",
  yen: "¥",
  brvbar: "¦",
  sect: "§",
  uml: "¨",
  copy: "©",
  ordf: "ª",
  laquo: "«",
  not: "¬",
  shy: "­",
  reg: "®",
  macr: "¯",
  deg: "°",
  plusmn: "±",
  sup2: "²",
  sup3: "³",
  acute: "´",
  micro: "µ",
  para: "¶",
  middot: "·",
  cedil: "¸",
  sup1: "¹",
  ordm: "º",
  raquo: "»",
  frac14: "¼",
  frac12: "½",
  frac34: "¾",
  iquest: "¿",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Atilde: "Ã",
  Auml: "Ä",
  Aring: "Å",
  AElig: "Æ",
  Ccedil: "Ç",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  Igrave: "Ì",
  Iacute: "Í",
  Icirc: "Î",
  Iuml: "Ï",
  ETH: "Ð",
  Ntilde: "Ñ",
  Ograve: "Ò",
  Oacute: "Ó",
  Ocirc: "Ô",
  Otilde: "Õ",
  Ouml: "Ö",
  times: "×",
  Oslash: "Ø",
  Ugrave: "Ù",
  Uacute: "Ú",
  Ucirc: "Û",
  Uuml: "Ü",
  Yacute: "Ý",
  THORN: "Þ",
  szlig: "ß",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  aelig: "æ",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  eth: "ð",
  ntilde: "ñ",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  divide: "÷",
  oslash: "ø",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  yacute: "ý",
  thorn: "þ",
  yuml: "ÿ",
  fnof: "ƒ",
  Alpha: "Α",
  Beta: "Β",
  Gamma: "Γ",
  Delta: "Δ",
  Epsilon: "Ε",
  Zeta: "Ζ",
  Eta: "Η",
  Theta: "Θ",
  Iota: "Ι",
  Kappa: "Κ",
  Lambda: "Λ",
  Mu: "Μ",
  Nu: "Ν",
  Xi: "Ξ",
  Omicron: "Ο",
  Pi: "Π",
  Rho: "Ρ",
  Sigma: "Σ",
  Tau: "Τ",
  Upsilon: "Υ",
  Phi: "Φ",
  Chi: "Χ",
  Psi: "Ψ",
  Omega: "Ω",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  rho: "ρ",
  sigmaf: "ς",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  thetasym: "ϑ",
  upsih: "ϒ",
  piv: "ϖ",
  bull: "•",
  hellip: "…",
  prime: "′",
  Prime: "″",
  oline: "‾",
  frasl: "⁄",
  weierp: "℘",
  image: "ℑ",
  real: "ℜ",
  trade: "™",
  alefsym: "ℵ",
  larr: "←",
  uarr: "↑",
  rarr: "→",
  darr: "↓",
  harr: "↔",
  crarr: "↵",
  lArr: "⇐",
  uArr: "⇑",
  rArr: "⇒",
  dArr: "⇓",
  hArr: "⇔",
  forall: "∀",
  part: "∂",
  exist: "∃",
  empty: "∅",
  nabla: "∇",
  isin: "∈",
  notin: "∉",
  ni: "∋",
  prod: "∏",
  sum: "∑",
  minus: "−",
  lowast: "∗",
  radic: "√",
  prop: "∝",
  infin: "∞",
  ang: "∠",
  and: "∧",
  or: "∨",
  cap: "∩",
  cup: "∪",
  int: "∫",
  there4: "∴",
  sim: "∼",
  cong: "≅",
  asymp: "≈",
  ne: "≠",
  equiv: "≡",
  le: "≤",
  ge: "≥",
  sub: "⊂",
  sup: "⊃",
  nsub: "⊄",
  sube: "⊆",
  supe: "⊇",
  oplus: "⊕",
  otimes: "⊗",
  perp: "⊥",
  sdot: "⋅",
  lceil: "⌈",
  rceil: "⌉",
  lfloor: "⌊",
  rfloor: "⌋",
  lang: "〈",
  rang: "〉",
  loz: "◊",
  spades: "♠",
  clubs: "♣",
  hearts: "♥",
  diams: "♦",
  quot: '"',
  amp: "&",
  lt: "<",
  gt: ">",
  OElig: "Œ",
  oelig: "œ",
  Scaron: "Š",
  scaron: "š",
  Yuml: "Ÿ",
  circ: "ˆ",
  tilde: "˜",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  zwnj: "‌",
  zwj: "‍",
  lrm: "‎",
  rlm: "‏",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  dagger: "†",
  Dagger: "‡",
  permil: "‰",
  lsaquo: "‹",
  rsaquo: "›",
  euro: "€"
}, n0 = [
  "cent",
  "copy",
  "divide",
  "gt",
  "lt",
  "not",
  "para",
  "times"
], tm = {}.hasOwnProperty, Ga = {};
let Ko;
for (Ko in Jl)
  tm.call(Jl, Ko) && (Ga[Jl[Ko]] = Ko);
const r0 = /[^\dA-Za-z]/;
function i0(n, e, t, r) {
  const i = String.fromCharCode(n);
  if (tm.call(Ga, i)) {
    const o = Ga[i], s = "&" + o;
    return t && t0.includes(o) && !n0.includes(o) && (!r || e && e !== 61 && r0.test(String.fromCharCode(e))) ? s : s + ";";
  }
  return "";
}
function o0(n, e, t) {
  let r = Q1(n, e, t.omitOptionalSemicolons), i;
  if ((t.useNamedReferences || t.useShortestReferences) && (i = i0(
    n,
    e,
    t.omitOptionalSemicolons,
    t.attribute
  )), (t.useShortestReferences || !i) && t.useShortestReferences) {
    const o = e0(n, e, t.omitOptionalSemicolons);
    o.length < r.length && (r = o);
  }
  return i && (!t.useShortestReferences || i.length < r.length) ? i : r;
}
function Lr(n, e) {
  return J1(n, Object.assign({ format: o0 }, e));
}
const s0 = /^>|^->|<!--|-->|--!>|<!-$/g, l0 = [">"], a0 = ["<", ">"];
function c0(n, e, t, r) {
  return r.settings.bogusComments ? "<?" + Lr(
    n.value,
    Object.assign({}, r.settings.characterReferences, {
      subset: l0
    })
  ) + ">" : "<!--" + n.value.replace(s0, i) + "-->";
  function i(o) {
    return Lr(
      o,
      Object.assign({}, r.settings.characterReferences, {
        subset: a0
      })
    );
  }
}
function u0(n, e, t, r) {
  return "<!" + (r.settings.upperDoctype ? "DOCTYPE" : "doctype") + (r.settings.tightDoctype ? "" : " ") + "html>";
}
function d0(n, e) {
  const t = e || {};
  return (n[n.length - 1] === "" ? [...n, ""] : n).join(
    (t.padRight ? " " : "") + "," + (t.padLeft === !1 ? "" : " ")
  ).trim();
}
function h0(n) {
  return n.join(" ").trim();
}
const f0 = /[ \t\n\f\r]/g;
function Wc(n) {
  return typeof n == "object" ? n.type === "text" ? hh(n.value) : !1 : hh(n);
}
function hh(n) {
  return n.replace(f0, "") === "";
}
const me = rm(1), nm = rm(-1), p0 = [];
function rm(n) {
  return e;
  function e(t, r, i) {
    const o = t ? t.children : p0;
    let s = (r || 0) + n, l = o[s];
    if (!i)
      for (; l && Wc(l); )
        s += n, l = o[s];
    return l;
  }
}
const m0 = {}.hasOwnProperty;
function im(n) {
  return e;
  function e(t, r, i) {
    return m0.call(n, t.tagName) && n[t.tagName](t, r, i);
  }
}
const Kc = im({
  body: y0,
  caption: Gl,
  colgroup: Gl,
  dd: C0,
  dt: w0,
  head: Gl,
  html: g0,
  li: k0,
  optgroup: S0,
  option: x0,
  p: b0,
  rp: fh,
  rt: fh,
  tbody: E0,
  td: ph,
  tfoot: M0,
  th: ph,
  thead: v0,
  tr: T0
});
function Gl(n, e, t) {
  const r = me(t, e, !0);
  return !r || r.type !== "comment" && !(r.type === "text" && Wc(r.value.charAt(0)));
}
function g0(n, e, t) {
  const r = me(t, e);
  return !r || r.type !== "comment";
}
function y0(n, e, t) {
  const r = me(t, e);
  return !r || r.type !== "comment";
}
function b0(n, e, t) {
  const r = me(t, e);
  return r ? r.type === "element" && (r.tagName === "address" || r.tagName === "article" || r.tagName === "aside" || r.tagName === "blockquote" || r.tagName === "details" || r.tagName === "div" || r.tagName === "dl" || r.tagName === "fieldset" || r.tagName === "figcaption" || r.tagName === "figure" || r.tagName === "footer" || r.tagName === "form" || r.tagName === "h1" || r.tagName === "h2" || r.tagName === "h3" || r.tagName === "h4" || r.tagName === "h5" || r.tagName === "h6" || r.tagName === "header" || r.tagName === "hgroup" || r.tagName === "hr" || r.tagName === "main" || r.tagName === "menu" || r.tagName === "nav" || r.tagName === "ol" || r.tagName === "p" || r.tagName === "pre" || r.tagName === "section" || r.tagName === "table" || r.tagName === "ul") : !t || // Confusing parent.
  !(t.type === "element" && (t.tagName === "a" || t.tagName === "audio" || t.tagName === "del" || t.tagName === "ins" || t.tagName === "map" || t.tagName === "noscript" || t.tagName === "video"));
}
function k0(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && r.tagName === "li";
}
function w0(n, e, t) {
  const r = me(t, e);
  return !!(r && r.type === "element" && (r.tagName === "dt" || r.tagName === "dd"));
}
function C0(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && (r.tagName === "dt" || r.tagName === "dd");
}
function fh(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && (r.tagName === "rp" || r.tagName === "rt");
}
function S0(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && r.tagName === "optgroup";
}
function x0(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && (r.tagName === "option" || r.tagName === "optgroup");
}
function v0(n, e, t) {
  const r = me(t, e);
  return !!(r && r.type === "element" && (r.tagName === "tbody" || r.tagName === "tfoot"));
}
function E0(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && (r.tagName === "tbody" || r.tagName === "tfoot");
}
function M0(n, e, t) {
  return !me(t, e);
}
function T0(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && r.tagName === "tr";
}
function ph(n, e, t) {
  const r = me(t, e);
  return !r || r.type === "element" && (r.tagName === "td" || r.tagName === "th");
}
const N0 = im({
  body: O0,
  colgroup: R0,
  head: A0,
  html: I0,
  tbody: D0
});
function I0(n) {
  const e = me(n, -1);
  return !e || e.type !== "comment";
}
function A0(n) {
  const e = /* @__PURE__ */ new Set();
  for (const r of n.children)
    if (r.type === "element" && (r.tagName === "base" || r.tagName === "title")) {
      if (e.has(r.tagName)) return !1;
      e.add(r.tagName);
    }
  const t = n.children[0];
  return !t || t.type === "element";
}
function O0(n) {
  const e = me(n, -1, !0);
  return !e || e.type !== "comment" && !(e.type === "text" && Wc(e.value.charAt(0))) && !(e.type === "element" && (e.tagName === "meta" || e.tagName === "link" || e.tagName === "script" || e.tagName === "style" || e.tagName === "template"));
}
function R0(n, e, t) {
  const r = nm(t, e), i = me(n, -1, !0);
  return t && r && r.type === "element" && r.tagName === "colgroup" && Kc(r, t.children.indexOf(r), t) ? !1 : !!(i && i.type === "element" && i.tagName === "col");
}
function D0(n, e, t) {
  const r = nm(t, e), i = me(n, -1);
  return t && r && r.type === "element" && (r.tagName === "thead" || r.tagName === "tbody") && Kc(r, t.children.indexOf(r), t) ? !1 : !!(i && i.type === "element" && i.tagName === "tr");
}
const Jo = {
  // See: <https://html.spec.whatwg.org/#attribute-name-state>.
  name: [
    [`	
\f\r &/=>`.split(""), `	
\f\r "&'/=>\``.split("")],
    [`\0	
\f\r "&'/<=>`.split(""), `\0	
\f\r "&'/<=>\``.split("")]
  ],
  // See: <https://html.spec.whatwg.org/#attribute-value-(unquoted)-state>.
  unquoted: [
    [`	
\f\r &>`.split(""), `\0	
\f\r "&'<=>\``.split("")],
    [`\0	
\f\r "&'<=>\``.split(""), `\0	
\f\r "&'<=>\``.split("")]
  ],
  // See: <https://html.spec.whatwg.org/#attribute-value-(single-quoted)-state>.
  single: [
    ["&'".split(""), "\"&'`".split("")],
    ["\0&'".split(""), "\0\"&'`".split("")]
  ],
  // See: <https://html.spec.whatwg.org/#attribute-value-(double-quoted)-state>.
  double: [
    ['"&'.split(""), "\"&'`".split("")],
    ['\0"&'.split(""), "\0\"&'`".split("")]
  ]
};
function L0(n, e, t, r) {
  const i = r.schema, o = i.space === "svg" ? !1 : r.settings.omitOptionalTags;
  let s = i.space === "svg" ? r.settings.closeEmptyElements : r.settings.voids.includes(n.tagName.toLowerCase());
  const l = [];
  let a;
  i.space === "html" && n.tagName === "svg" && (r.schema = em);
  const c = P0(r, n.properties), u = r.all(
    i.space === "html" && n.tagName === "template" ? n.content : n
  );
  return r.schema = i, u && (s = !1), (c || !o || !N0(n, e, t)) && (l.push("<", n.tagName, c ? " " + c : ""), s && (i.space === "svg" || r.settings.closeSelfClosing) && (a = c.charAt(c.length - 1), (!r.settings.tightSelfClosing || a === "/" || a && a !== '"' && a !== "'") && l.push(" "), l.push("/")), l.push(">")), l.push(u), !s && (!o || !Kc(n, e, t)) && l.push("</" + n.tagName + ">"), l.join("");
}
function P0(n, e) {
  const t = [];
  let r = -1, i;
  if (e) {
    for (i in e)
      if (e[i] !== null && e[i] !== void 0) {
        const o = B0(n, i, e[i]);
        o && t.push(o);
      }
  }
  for (; ++r < t.length; ) {
    const o = n.settings.tightAttributes ? t[r].charAt(t[r].length - 1) : void 0;
    r !== t.length - 1 && o !== '"' && o !== "'" && (t[r] += " ");
  }
  return t.join("");
}
function B0(n, e, t) {
  const r = _1(n.schema, e), i = n.settings.allowParseErrors && n.schema.space === "html" ? 0 : 1, o = n.settings.allowDangerousCharacters ? 0 : 1;
  let s = n.quote, l;
  if (r.overloadedBoolean && (t === r.attribute || t === "") ? t = !0 : (r.boolean || r.overloadedBoolean) && (typeof t != "string" || t === r.attribute || t === "") && (t = !!t), t == null || t === !1 || typeof t == "number" && Number.isNaN(t))
    return "";
  const a = Lr(
    r.attribute,
    Object.assign({}, n.settings.characterReferences, {
      // Always encode without parse errors in non-HTML.
      subset: Jo.name[i][o]
    })
  );
  return t === !0 || (t = Array.isArray(t) ? (r.commaSeparated ? d0 : h0)(t, {
    padLeft: !n.settings.tightCommaSeparatedLists
  }) : String(t), n.settings.collapseEmptyAttributes && !t) ? a : (n.settings.preferUnquoted && (l = Lr(
    t,
    Object.assign({}, n.settings.characterReferences, {
      attribute: !0,
      subset: Jo.unquoted[i][o]
    })
  )), l !== t && (n.settings.quoteSmart && Ds(t, s) > Ds(t, n.alternative) && (s = n.alternative), l = s + Lr(
    t,
    Object.assign({}, n.settings.characterReferences, {
      // Always encode without parse errors in non-HTML.
      subset: (s === "'" ? Jo.single : Jo.double)[i][o],
      attribute: !0
    })
  ) + s), a + (l && "=" + l));
}
const $0 = ["<", "&"];
function om(n, e, t, r) {
  return t && t.type === "element" && (t.tagName === "script" || t.tagName === "style") ? n.value : Lr(
    n.value,
    Object.assign({}, r.settings.characterReferences, {
      subset: $0
    })
  );
}
function z0(n, e, t, r) {
  return r.settings.allowDangerousHtml ? n.value : om(n, e, t, r);
}
function F0(n, e, t, r) {
  return r.all(n);
}
const _0 = yp("type", {
  invalid: H0,
  unknown: q0,
  handlers: { comment: c0, doctype: u0, element: L0, raw: z0, root: F0, text: om }
});
function H0(n) {
  throw new Error("Expected node, not `" + n + "`");
}
function q0(n) {
  const e = (
    /** @type {Nodes} */
    n
  );
  throw new Error("Cannot compile unknown node `" + e.type + "`");
}
const j0 = {}, V0 = {}, U0 = [];
function W0(n, e) {
  const t = e || j0, r = t.quote || '"', i = r === '"' ? "'" : '"';
  if (r !== '"' && r !== "'")
    throw new Error("Invalid quote `" + r + "`, expected `'` or `\"`");
  return {
    one: K0,
    all: J0,
    settings: {
      omitOptionalTags: t.omitOptionalTags || !1,
      allowParseErrors: t.allowParseErrors || !1,
      allowDangerousCharacters: t.allowDangerousCharacters || !1,
      quoteSmart: t.quoteSmart || !1,
      preferUnquoted: t.preferUnquoted || !1,
      tightAttributes: t.tightAttributes || !1,
      upperDoctype: t.upperDoctype || !1,
      tightDoctype: t.tightDoctype || !1,
      bogusComments: t.bogusComments || !1,
      tightCommaSeparatedLists: t.tightCommaSeparatedLists || !1,
      tightSelfClosing: t.tightSelfClosing || !1,
      collapseEmptyAttributes: t.collapseEmptyAttributes || !1,
      allowDangerousHtml: t.allowDangerousHtml || !1,
      voids: t.voids || L1,
      characterReferences: t.characterReferences || V0,
      closeSelfClosing: t.closeSelfClosing || !1,
      closeEmptyElements: t.closeEmptyElements || !1
    },
    schema: t.space === "svg" ? em : j1,
    quote: r,
    alternative: i
  }.one(
    Array.isArray(n) ? { type: "root", children: n } : n,
    void 0,
    void 0
  );
}
function K0(n, e, t) {
  return _0(n, e, t, this);
}
function J0(n) {
  const e = [], t = n && n.children || U0;
  let r = -1;
  for (; ++r < t.length; )
    e[r] = this.one(t[r], r, n);
  return e.join("");
}
function G0(n) {
  const e = this, t = { ...e.data("settings"), ...n };
  e.compiler = r;
  function r(i) {
    return W0(i, t);
  }
}
const Y0 = {
  acceptMode: !1,
  rejectMode: !1,
  classPrefix: "critic"
}, xr = {
  // Addition: {++text++}
  addition: /\{\+\+([\s\S]+?)\+\+\}/g,
  // Deletion: {--text--}
  deletion: /\{--([\s\S]+?)--\}/g,
  // Substitution: {~~old~>new~~}
  substitution: /\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g,
  // Comment: {>>comment<<}
  comment: /\{>>([\s\S]+?)<<\}/g,
  // Highlight: {==text==} optionally followed by {>>comment<<}
  highlight: /\{==([\s\S]+?)==\}(?:\{>>([\s\S]+?)<<\})?/g
};
function X0(n, e) {
  const { acceptMode: t, rejectMode: r, classPrefix: i } = e;
  let o = n;
  return o = o.replace(xr.addition, (s, l) => r ? "" : `<ins class="${i}-addition" data-critic-type="addition">${l}</ins>`), o = o.replace(xr.deletion, (s, l) => t ? "" : `<del class="${i}-deletion" data-critic-type="deletion">${l}</del>`), o = o.replace(xr.substitution, (s, l, a) => {
    let c = "";
    return t || (c += `<del class="${i}-substitution-old" data-critic-type="deletion">${l}</del>`), r || (c += `<ins class="${i}-substitution-new" data-critic-type="addition">${a}</ins>`), `<span class="${i}-substitution" data-critic-type="substitution">${c}</span>`;
  }), o = o.replace(xr.highlight, (s, l, a) => {
    const c = a ? `<span class="${i}-comment" data-critic-type="comment">${a}</span>` : "";
    return `<mark class="${i}-highlight" data-critic-type="highlight">${l}</mark>${c}`;
  }), o = o.replace(xr.comment, (s, l) => `<span class="${i}-comment" data-critic-type="comment">${l}</span>`), o;
}
function Q0(n) {
  return Object.values(xr).some((e) => (e.lastIndex = 0, e.test(n)));
}
function Z0(n, e, t) {
  const { classPrefix: r, acceptMode: i, rejectMode: o } = t;
  let s = "";
  return i || (s += `<del class="${r}-substitution-old" data-critic-type="deletion">${n}</del>`), o || (s += `<ins class="${r}-substitution-new" data-critic-type="addition">${e}</ins>`), `<span class="${r}-substitution" data-critic-type="substitution">${s}</span>`;
}
function ev(n, e) {
  if (!n.children) return;
  const t = [];
  for (let r = 0; r < n.children.length; r++) {
    const i = n.children[r];
    if (i.type === "delete") {
      const o = t[t.length - 1], s = n.children[r + 1], l = i.children?.map((u) => "value" in u ? u.value : "").join("") ?? "", [a, c] = l.split("~>");
      if (a !== void 0 && c !== void 0 && o && o.type === "text" && s && s.type === "text" && o.value?.includes("{") && s.value?.includes("}")) {
        const u = o.value.lastIndexOf("{");
        if (u !== -1) {
          const h = o.value.slice(0, u) + o.value.slice(u + 1);
          h ? o.value = h : t.pop();
        }
        const d = Z0(a, c, e);
        t.push({
          type: "html",
          value: d
        }), s.value = s.value.replace(/^\}/, "");
        continue;
      }
    }
    t.push(i);
  }
  n.children = t;
}
const tv = (n = {}) => {
  const e = { ...Y0, ...n };
  return (t) => {
    rn(t, "text", (r, i, o) => {
      if (!o || i === null || i === void 0) return;
      const s = r.value;
      if (!Q0(s)) return;
      const a = {
        type: "html",
        value: X0(s, e)
      };
      o.children[i] = a;
    }), rn(t, ["paragraph", "heading", "table", "tableRow", "tableCell"], (r) => {
      ev(r, e);
    });
  };
}, nv = {
  enableCriticMarkup: !0,
  allowRawHtml: !1
};
class rv {
  constructor() {
    T(this, "cache", /* @__PURE__ */ new Map());
  }
  render(e, t) {
    const r = this.getProcessor(t);
    return String(r.processSync(e));
  }
  renderAsync(e, t) {
    return this.getProcessor(t).process(e).then(String);
  }
  getProcessor(e) {
    const t = { ...nv, ...e }, r = `${t.enableCriticMarkup}:${t.allowRawHtml}`, i = this.cache.get(r);
    if (i)
      return i;
    const o = Xi();
    return o.use(Qi).use(_c), t.enableCriticMarkup && o.use(tv), o.use(D1, { allowDangerousHtml: !0 }).use(G0, { allowDangerousHtml: !0 }), this.cache.set(r, o), o;
  }
}
function mh(n) {
  if (typeof document > "u")
    return n;
  const e = document.createElement("div");
  e.innerHTML = n, e.querySelectorAll("script").forEach((r) => {
    const i = document.createTextNode(r.outerHTML);
    r.replaceWith(i);
  }), e.querySelectorAll("*").forEach((r) => {
    Array.from(r.attributes).forEach((i) => {
      i.name.toLowerCase().startsWith("on") && r.removeAttribute(i.name);
    });
  });
  const t = e.innerHTML;
  return iv(t);
}
function iv(n) {
  return n.replace(/&#x26;/gi, "&amp;").replace(/&#x3c;/gi, "&lt;").replace(/&#x3e;/gi, "&gt;");
}
class ov {
  constructor(e = {}) {
    T(this, "options");
    T(this, "renderer");
    T(this, "astProcessor", Xi().use(Qi).use(_c));
    this.options = {
      enableCriticMarkup: e.enableCriticMarkup ?? !0,
      allowRawHtml: e.allowRawHtml ?? !1
    }, this.renderer = new rv();
  }
  getOptions() {
    return { ...this.options };
  }
  setEnableCriticMarkup(e) {
    this.options = { ...this.options, enableCriticMarkup: e };
  }
  setAllowRawHtml(e) {
    this.options = { ...this.options, allowRawHtml: e };
  }
  updateOptions(e) {
    this.options = {
      enableCriticMarkup: e.enableCriticMarkup ?? this.options.enableCriticMarkup,
      allowRawHtml: e.allowRawHtml ?? this.options.allowRawHtml
    };
  }
  resolveRendererOptions(e) {
    const t = {
      enableCriticMarkup: this.options.enableCriticMarkup,
      allowRawHtml: this.options.allowRawHtml
    };
    if (!e)
      return t;
    const r = { ...t };
    return e.enableCriticMarkup !== void 0 && (r.enableCriticMarkup = e.enableCriticMarkup), e.allowRawHtml !== void 0 && (r.allowRawHtml = e.allowRawHtml), r;
  }
  /**
   * Convert markdown to HTML using Remark/Unified pipeline (async)
   */
  async render(e, t) {
    const r = this.resolveRendererOptions({ enableCriticMarkup: t }), i = await this.renderer.renderAsync(e, r);
    return this.sanitizeOutput(i, r);
  }
  /**
   * Convert markdown to HTML using Remark/Unified pipeline (synchronous)
   */
  renderSync(e, t) {
    const r = this.resolveRendererOptions({ enableCriticMarkup: t }), i = this.renderer.render(e, r);
    return this.sanitizeOutput(i, r);
  }
  /**
   * Convert markdown inline content to HTML
   */
  renderInline(e) {
    return this.renderSync(e).replace(/^<p>|<\/p>$/g, "").trim();
  }
  sanitizeOutput(e, t) {
    return t.allowRawHtml ? e : mh(e);
  }
  /**
   * Parse markdown to MDAST (Markdown Abstract Syntax Tree)
   */
  parseToAST(e) {
    return this.astProcessor.parse(e);
  }
  /**
   * Extract plain text from markdown using Remark
   */
  toPlainText(e) {
    return this.parseToAST(e).children.map((r) => tl(r).trim()).filter((r) => r.length > 0).join(`
`);
  }
  /**
   * Convert a single element to HTML based on its type
   */
  renderElement(e, t, r) {
    if (t === "Header" && r)
      return this.renderHeading(e, r);
    if (t === "BlockQuote" && !e.trim().startsWith(">")) {
      const o = e.split(`
`).map((s) => `> ${s}`);
      return this.renderSync(o.join(`
`));
    }
    if (t === "CodeBlock") {
      let i = this.renderSync(e);
      return i.includes("<code>") || (i = i.replace(/<code[^>]*>/, "<code>")), i;
    }
    return this.renderSync(e);
  }
  /**
   * Sanitize HTML to prevent XSS
   */
  sanitize(e) {
    return mh(e);
  }
  /**
   * Remove trailing Pandoc attribute blocks (e.g. {#id .class}) from heading source
   * while leaving CriticMarkup blocks like {++addition++} untouched.
   */
  stripPandocHeadingAttributes(e) {
    let t = e.trimEnd();
    const r = /\s+\{([^}]+)\}\s*$/;
    for (; ; ) {
      const i = r.exec(t);
      if (!i)
        break;
      const o = i[1]?.trim() ?? "";
      if (!o || !this.isPandocAttributeBlock(o))
        break;
      const s = i[0] ?? "";
      t = t.slice(0, Math.max(0, t.length - s.length)).trimEnd();
    }
    return t;
  }
  renderHeading(e, t) {
    const r = this.stripPandocHeadingAttributes(e), i = this.extractHeadingText(r), o = i ? `${"#".repeat(t)} ${i}` : `${"#".repeat(t)}`;
    return this.renderSync(o);
  }
  extractHeadingText(e) {
    const t = e.trim(), r = (s) => s.startsWith("\\#") ? s : s.replace(/^#+\s+/, "").trim(), i = t.match(/^#+\s*(.*)$/);
    if (i) {
      const s = i[1]?.trim() ?? "";
      return r(s);
    }
    const o = t.split(/\r?\n/);
    if (o.length >= 2) {
      const s = o[1]?.trim() ?? "";
      if (/^=+$|^-+$/.test(s)) {
        const l = o[0]?.trim() ?? "";
        return r(l);
      }
    }
    return r(t);
  }
  isPandocAttributeBlock(e) {
    if (!e)
      return !1;
    const t = e.split(/\s+/);
    return t.length === 0 ? !1 : t.every((r) => r ? !!(r.startsWith("#") && r.length > 1 || r.startsWith(".") && r.length > 1 || r.includes("=") && !r.startsWith("{") && !r.startsWith("}")) : !1);
  }
}
class sv {
  constructor() {
    T(this, "comments", /* @__PURE__ */ new Map());
    // CriticMarkup regex patterns
    T(this, "patterns", {
      addition: /\{\+\+(.+?)\+\+\}/g,
      deletion: /\{--(.+?)--\}/g,
      substitution: /\{~~(.+?)~>(.+?)~~\}/g,
      comment: /\{>>(.+?)<<\}/g,
      highlight: /\{==(.+?)==\}(?:\{>>(.+?)<<\})?/g
    });
  }
  /**
   * Parse CriticMarkup from markdown text
   */
  parse(e) {
    const t = [];
    return this.segmentMarkdown(e).forEach((i) => {
      i.type !== "text" || !i.content || this.collectCriticMarkupMatches(i.content, i.start, t);
    }), t.sort((i, o) => i.start - o.start);
  }
  /**
   * Render CriticMarkup as HTML
   */
  renderToHTML(e) {
    return this.segmentMarkdown(e).map((r) => r.type === "code" || !r.content ? r.content : this.renderMarkupSegment(r.content)).join("");
  }
  /**
   * Accept a CriticMarkup change (keep addition/replacement, remove deletion)
   */
  accept(e, t) {
    const r = e.substring(0, t.start), i = e.substring(t.end);
    switch (t.type) {
      case "addition":
        return r + t.content + i;
      case "deletion":
        return r + i;
      case "substitution":
        return r + (t.replacement || "") + i;
      case "highlight":
        return r + t.content + i;
      case "comment":
        return r + i;
      default:
        return e;
    }
  }
  /**
   * Reject a CriticMarkup change (keep original, remove addition)
   */
  reject(e, t) {
    const r = e.substring(0, t.start), i = e.substring(t.end);
    switch (t.type) {
      case "addition":
        return r + i;
      case "deletion":
        return r + t.content + i;
      case "substitution":
        return r + t.content + i;
      case "highlight":
        return r + t.content + i;
      case "comment":
        return r + i;
      default:
        return e;
    }
  }
  /**
   * Accept all CriticMarkup changes
   */
  acceptAll(e) {
    let t = e;
    const r = this.parse(t);
    for (let i = r.length - 1; i >= 0; i--) {
      const o = r[i];
      o && (t = this.accept(t, o));
    }
    return t;
  }
  /**
   * Reject all CriticMarkup changes
   */
  rejectAll(e) {
    let t = e;
    const r = this.parse(t);
    for (let i = r.length - 1; i >= 0; i--) {
      const o = r[i];
      o && (t = this.reject(t, o));
    }
    return t;
  }
  /**
   * Add a comment to an element
   */
  addComment(e, t, r, i = "comment") {
    const o = {
      id: this.generateCommentId(),
      elementId: e,
      userId: r,
      timestamp: Date.now(),
      content: t,
      resolved: !1,
      type: i
    };
    return this.comments.set(o.id, o), o;
  }
  /**
   * Get comment by ID
   */
  getComment(e) {
    return this.comments.get(e);
  }
  /**
   * Get all comments for an element
   */
  getCommentsForElement(e) {
    return Array.from(this.comments.values()).filter(
      (t) => t.elementId === e
    );
  }
  /**
   * Get all comments
   */
  getAllComments() {
    return Array.from(this.comments.values());
  }
  /**
   * Resolve a comment
   */
  resolveComment(e) {
    const t = this.comments.get(e);
    return t ? (t.resolved = !0, !0) : !1;
  }
  /**
   * Unresolve a comment
   */
  unresolveComment(e) {
    const t = this.comments.get(e);
    return t ? (t.resolved = !1, !0) : !1;
  }
  /**
   * Delete a comment
   */
  deleteComment(e) {
    return this.comments.delete(e);
  }
  segmentMarkdown(e) {
    const t = this.collectCodeRanges(e);
    if (t.length === 0)
      return [{ type: "text", content: e, start: 0 }];
    const r = [];
    let i = 0;
    return t.forEach((o) => {
      o.start > i && r.push({
        type: "text",
        content: e.slice(i, o.start),
        start: i
      }), r.push({
        type: "code",
        content: e.slice(o.start, o.end),
        start: o.start
      }), i = o.end;
    }), i < e.length && r.push({
      type: "text",
      content: e.slice(i),
      start: i
    }), r;
  }
  collectCodeRanges(e) {
    const t = [];
    let r;
    const i = /(```+[\s\S]*?```+|~~~+[\s\S]*?~~~+)/g;
    for (; (r = i.exec(e)) !== null; ) {
      const s = r?.[0] ?? "", l = r?.index ?? 0;
      t.push({
        start: l,
        end: l + s.length
      });
    }
    const o = /(`+)([\s\S]*?)(\1)/g;
    for (; (r = o.exec(e)) !== null; ) {
      const s = r?.[0] ?? "", l = r?.index ?? 0, a = l + s.length;
      t.some((c) => l >= c.start && a <= c.end) || t.push({ start: l, end: a });
    }
    return t.sort((s, l) => s.start - l.start), this.mergeRanges(t);
  }
  mergeRanges(e) {
    if (e.length === 0)
      return [];
    const t = e[0];
    if (!t)
      return [];
    const r = [{ ...t }];
    for (let i = 1; i < e.length; i++) {
      const o = e[i];
      if (!o) continue;
      const s = r[r.length - 1];
      if (!s) {
        r.push({ ...o });
        continue;
      }
      const l = o.start ?? 0, a = o.end ?? l, c = s.start ?? 0, u = s.end ?? c;
      l <= u ? s.end = Math.max(u, a) : r.push({ ...o });
    }
    return r;
  }
  collectCriticMarkupMatches(e, t, r) {
    let i;
    const o = new RegExp(this.patterns.addition);
    for (; (i = o.exec(e)) !== null; ) {
      const u = i?.[1] ?? "", d = i?.[0] ?? "", h = i?.index ?? 0;
      r.push({
        type: "addition",
        content: u,
        start: t + h,
        end: t + h + d.length
      });
    }
    const s = new RegExp(this.patterns.deletion);
    for (; (i = s.exec(e)) !== null; ) {
      const u = i?.[1] ?? "", d = i?.[0] ?? "", h = i?.index ?? 0;
      r.push({
        type: "deletion",
        content: u,
        start: t + h,
        end: t + h + d.length
      });
    }
    const l = new RegExp(this.patterns.substitution);
    for (; (i = l.exec(e)) !== null; ) {
      const u = i?.[1] ?? "", d = i?.[2] ?? "", h = i?.[0] ?? "", f = i?.index ?? 0;
      r.push({
        type: "substitution",
        content: u,
        replacement: d,
        start: t + f,
        end: t + f + h.length
      });
    }
    const a = new RegExp(this.patterns.highlight);
    for (; (i = a.exec(e)) !== null; ) {
      const u = i?.[1] ?? "", d = i?.[2] ?? "", h = i?.[0] ?? "", f = i?.index ?? 0;
      r.push({
        type: "highlight",
        content: u,
        comment: d,
        start: t + f,
        end: t + f + h.length
      });
    }
    const c = new RegExp(this.patterns.comment);
    for (; (i = c.exec(e)) !== null; ) {
      const u = i?.[0] ?? "", d = i?.[1] ?? "", h = i?.index ?? 0, f = t + h, p = f + u.length;
      r.some(
        (y) => y.type === "highlight" && y.comment && f >= y.start && f < y.end
      ) || r.push({
        type: "comment",
        content: d,
        start: f,
        end: p
      });
    }
  }
  renderMarkupSegment(e) {
    let t = e;
    return t = t.replace(
      new RegExp(this.patterns.addition),
      '<span class="critic-addition" data-critic-type="addition">$1</span>'
    ), t = t.replace(
      new RegExp(this.patterns.deletion),
      '<span class="critic-deletion" data-critic-type="deletion">$1</span>'
    ), t = t.replace(
      new RegExp(this.patterns.substitution),
      '<span class="critic-substitution" data-critic-type="substitution" data-critic-original="$1">$2</span>'
    ), t = t.replace(
      new RegExp(this.patterns.highlight),
      (r, i, o) => o ? `<span class="critic-highlight" data-critic-type="highlight" data-critic-comment="${this.escapeHtml(o)}">${i}</span>` : `<span class="critic-highlight" data-critic-type="highlight">${i}</span>`
    ), t = t.replace(
      new RegExp(this.patterns.comment),
      '<span class="critic-comment" data-critic-type="comment">$1</span>'
    ), t;
  }
  /**
   * Create CriticMarkup addition
   */
  createAddition(e) {
    return `{++${e}++}`;
  }
  /**
   * Create CriticMarkup deletion
   */
  createDeletion(e) {
    return `{--${e}--}`;
  }
  /**
   * Create CriticMarkup substitution
   */
  createSubstitution(e, t) {
    return `{~~${e}~>${t}~~}`;
  }
  /**
   * Create CriticMarkup comment
   */
  createComment(e) {
    return `{>>${e.replace(/\s+/g, " ").trim()}<<}`;
  }
  /**
   * Create CriticMarkup highlight with optional comment
   */
  createHighlight(e, t) {
    if (t) {
      const r = t.replace(/\s+/g, " ").trim();
      return `{==${e}==}{>>${r}<<}`;
    }
    return `{==${e}==}`;
  }
  /**
   * Check if markdown contains CriticMarkup
   */
  hasCriticMarkup(e) {
    return this.patterns.addition.test(e) || this.patterns.deletion.test(e) || this.patterns.substitution.test(e) || this.patterns.comment.test(e) || this.patterns.highlight.test(e);
  }
  /**
   * Strip all CriticMarkup (accept all changes)
   */
  stripCriticMarkup(e) {
    return this.acceptAll(e);
  }
  /**
   * Generate unique comment ID
   */
  generateCommentId() {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Escape HTML special characters
   */
  escapeHtml(e) {
    const t = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return e.replace(/[&<>"']/g, (r) => t[r] ?? r);
  }
  /**
   * Clear all comments
   */
  clear() {
    this.comments.clear();
  }
}
function sm(n) {
  const e = document.createElement("div");
  return e.textContent = n, e.innerHTML;
}
function $s(n) {
  return n === " " || n === "	" || n === "\r" || n === `
`;
}
function wi(n) {
  let e = n.length;
  for (; e > 0 && $s(n.charAt(e - 1)); )
    e--;
  return n.slice(0, e);
}
function gh(n) {
  let e = 0;
  for (; e < n.length && $s(n.charAt(e)); )
    e++;
  return n.slice(e);
}
function lv(n) {
  if (!n)
    return !1;
  const e = n.trim();
  if (e.length === 0)
    return !1;
  const t = e.charAt(0);
  if (t !== "=" && t !== "-")
    return !1;
  for (let r = 1; r < e.length; r++)
    if (e.charAt(r) !== t)
      return !1;
  return !0;
}
function Zi(n) {
  const e = n.split(/\r?\n/);
  let t = null;
  return e.map((i) => {
    const o = i.trim(), l = o.match(/^(`{3,}|~{3,})/)?.[1] ?? null;
    return l ? (t ? t && o.startsWith(t) && (t = null) : t = l, i) : t ? i : i.replace(
      /^(\s*)[*+]\s+/,
      (a, c) => `${c}- `
    );
  }).join(`
`);
}
class av extends CustomEvent {
  constructor(e, t) {
    super(e, {
      detail: t,
      bubbles: !0,
      cancelable: !0
    });
  }
}
const xt = {
  // Editor events
  EDITOR_READY: "module:editor:ready",
  EDITOR_CONTENT_CHANGED: "module:editor:content:changed",
  EDITOR_SELECTION_CHANGED: "module:editor:selection:changed",
  EDITOR_FOCUSED: "module:editor:focused",
  EDITOR_BLURRED: "module:editor:blurred",
  // Comment events
  COMMENT_SUBMITTED: "module:comment:submitted",
  COMMENT_CANCELLED: "module:comment:cancelled",
  COMMENT_COMPOSER_OPENED: "module:comment:composer:opened",
  COMMENT_COMPOSER_CLOSED: "module:comment:composer:closed",
  // Toolbar events
  TOOLBAR_COMMAND_EXECUTED: "module:toolbar:command:executed",
  TOOLBAR_STATE_UPDATED: "module:toolbar:state:updated",
  // Sidebar events
  SIDEBAR_TOGGLED: "module:sidebar:toggled",
  SIDEBAR_OPENED: "module:sidebar:opened",
  SIDEBAR_CLOSED: "module:sidebar:closed",
  // Context menu events
  CONTEXT_MENU_OPENED: "module:context:menu:opened",
  CONTEXT_MENU_CLOSED: "module:context:menu:closed"
};
class lm {
  constructor() {
    T(this, "listeners", /* @__PURE__ */ new Map());
  }
  /**
   * Listen to module events
   */
  on(e, t) {
    this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add((r) => {
      t(r.detail);
    });
  }
  /**
   * Listen to module events once
   */
  once(e, t) {
    const r = (i) => {
      t(i), this.off(e, r);
    };
    this.on(e, r);
  }
  /**
   * Stop listening to module events
   */
  off(e, t) {
    if (!this.listeners.has(e)) return;
    const r = this.listeners.get(e);
    r.forEach((i) => {
      i.toString() === t.toString() && r.delete(i);
    });
  }
  /**
   * Remove all listeners for a specific event type
   * This prevents duplicate listener accumulation when components are reinitialized
   * @param eventType - The specific event type to clear listeners for. If omitted, clears all listeners.
   */
  removeAllListeners(e) {
    e ? this.listeners.delete(e) : this.listeners.clear();
  }
  /**
   * Emit a module event
   */
  emit(e, t) {
    const r = new av(e, t);
    document.dispatchEvent(r), this.listeners.has(e) && this.listeners.get(e).forEach((i) => {
      i(r);
    });
  }
  /**
   * Clean up all listeners
   * Removes all listeners for all event types
   */
  clearListeners() {
    this.removeAllListeners();
  }
}
function cv() {
  return {
    activeEditor: null,
    activeEditorToolbar: null,
    currentElementId: null,
    milkdownEditor: null,
    currentEditorContent: "",
    showTrackedChanges: !0
  };
}
function uv() {
  return {
    isSidebarCollapsed: !1
  };
}
function dv() {
  return {
    activeCommentComposer: null,
    activeComposerInsertionAnchor: null,
    activeComposerOriginalItem: null,
    activeHighlightedSection: null,
    highlightedBy: null
  };
}
var rt = /* @__PURE__ */ ((n) => (n.docTypeError = "docTypeError", n.contextNotFound = "contextNotFound", n.timerNotFound = "timerNotFound", n.ctxCallOutOfScope = "ctxCallOutOfScope", n.createNodeInParserFail = "createNodeInParserFail", n.stackOverFlow = "stackOverFlow", n.parserMatchError = "parserMatchError", n.serializerMatchError = "serializerMatchError", n.getAtomFromSchemaFail = "getAtomFromSchemaFail", n.expectDomTypeError = "expectDomTypeError", n.callCommandBeforeEditorView = "callCommandBeforeEditorView", n.missingRootElement = "missingRootElement", n.missingNodeInSchema = "missingNodeInSchema", n.missingMarkInSchema = "missingMarkInSchema", n.ctxNotBind = "ctxNotBind", n.missingYjsDoc = "missingYjsDoc", n))(rt || {});
class gt extends Error {
  constructor(e, t) {
    super(t), this.name = "MilkdownError", this.code = e;
  }
}
const hv = (n, e) => typeof e == "function" ? "[Function]" : e, ll = (n) => JSON.stringify(n, hv);
function fv(n) {
  return new gt(
    rt.docTypeError,
    `Doc type error, unsupported type: ${ll(n)}`
  );
}
function pv(n) {
  return new gt(
    rt.contextNotFound,
    `Context "${n}" not found, do you forget to inject it?`
  );
}
function mv(n) {
  return new gt(
    rt.timerNotFound,
    `Timer "${n}" not found, do you forget to record it?`
  );
}
function al() {
  return new gt(
    rt.ctxCallOutOfScope,
    "Should not call a context out of the plugin."
  );
}
function gv(n, e, t) {
  const i = `Cannot create node for ${"name" in n ? n.name : n}`, o = (u) => {
    if (u == null) return "null";
    if (Array.isArray(u))
      return `[${u.map(o).join(", ")}]`;
    if (typeof u == "object")
      return "toJSON" in u && typeof u.toJSON == "function" ? JSON.stringify(u.toJSON()) : "spec" in u ? JSON.stringify(u.spec) : JSON.stringify(u);
    if (typeof u == "string" || typeof u == "number" || typeof u == "boolean")
      return JSON.stringify(u);
    if (typeof u == "function")
      return `[Function: ${u.name || "anonymous"}]`;
    try {
      return String(u);
    } catch {
      return "[Unserializable]";
    }
  }, s = ["[Description]", i], l = ["[Attributes]", e], a = [
    "[Content]",
    (t ?? []).map((u) => u ? typeof u == "object" && "type" in u ? `${u}` : o(u) : "null")
  ], c = [s, l, a].reduce(
    (u, [d, h]) => {
      const f = `${d}: ${o(h)}.`;
      return u.concat(f);
    },
    []
  );
  return new gt(
    rt.createNodeInParserFail,
    c.join(`
`)
  );
}
function am() {
  return new gt(
    rt.stackOverFlow,
    "Stack over flow, cannot pop on an empty stack."
  );
}
function yv(n) {
  return new gt(
    rt.parserMatchError,
    `Cannot match target parser for node: ${ll(n)}.`
  );
}
function bv(n) {
  return new gt(
    rt.serializerMatchError,
    `Cannot match target serializer for node: ${ll(n)}.`
  );
}
function Pt(n) {
  return new gt(
    rt.expectDomTypeError,
    `Expect to be a dom, but get: ${ll(n)}.`
  );
}
function Yl() {
  return new gt(
    rt.callCommandBeforeEditorView,
    "You're trying to call a command before editor view initialized, make sure to get commandManager from ctx after editor view has been initialized"
  );
}
function kv(n) {
  return new gt(
    rt.missingNodeInSchema,
    `Missing node in schema, milkdown cannot find "${n}" in schema.`
  );
}
function wv(n) {
  return new gt(
    rt.missingMarkInSchema,
    `Missing mark in schema, milkdown cannot find "${n}" in schema.`
  );
}
class cm {
  constructor() {
    this.sliceMap = /* @__PURE__ */ new Map(), this.get = (e) => {
      const t = typeof e == "string" ? [...this.sliceMap.values()].find((r) => r.type.name === e) : this.sliceMap.get(e.id);
      if (!t) {
        const r = typeof e == "string" ? e : e.name;
        throw pv(r);
      }
      return t;
    }, this.remove = (e) => {
      const t = typeof e == "string" ? [...this.sliceMap.values()].find((r) => r.type.name === e) : this.sliceMap.get(e.id);
      t && this.sliceMap.delete(t.type.id);
    }, this.has = (e) => typeof e == "string" ? [...this.sliceMap.values()].some((t) => t.type.name === e) : this.sliceMap.has(e.id);
  }
}
var St, Wt, _r, Yf;
let Cv = (Yf = class {
  /// @internal
  constructor(e, t, r) {
    W(this, St);
    /// @internal
    W(this, Wt);
    W(this, _r);
    P(this, St, []), P(this, _r, () => {
      v(this, St).forEach((i) => i(v(this, Wt)));
    }), this.set = (i) => {
      P(this, Wt, i), v(this, _r).call(this);
    }, this.get = () => v(this, Wt), this.update = (i) => {
      P(this, Wt, i(v(this, Wt))), v(this, _r).call(this);
    }, this.type = r, P(this, Wt, t), e.set(r.id, this);
  }
  /// Add a watcher for changes in the slice.
  /// Returns a function to remove the watcher.
  on(e) {
    return v(this, St).push(e), () => {
      P(this, St, v(this, St).filter((t) => t !== e));
    };
  }
  /// Add a one-time watcher for changes in the slice.
  /// The watcher will be removed after it is called.
  /// Returns a function to remove the watcher.
  once(e) {
    const t = this.on((r) => {
      e(r), t();
    });
    return t;
  }
  /// Remove a watcher.
  off(e) {
    P(this, St, v(this, St).filter((t) => t !== e));
  }
  /// Remove all watchers.
  offAll() {
    P(this, St, []);
  }
}, St = new WeakMap(), Wt = new WeakMap(), _r = new WeakMap(), Yf);
class Sv {
  /// Create a slice type with a default value and a name.
  /// The name should be unique in the container.
  constructor(e, t) {
    this.id = Symbol(`Context-${t}`), this.name = t, this._defaultValue = e, this._typeInfo = () => {
      throw al();
    };
  }
  /// Create a slice with a container.
  /// You can also pass a value to override the default value.
  create(e, t = this._defaultValue) {
    return new Cv(e, t, this);
  }
}
const X = (n, e) => new Sv(n, e);
var fo, po, mo, Wn, Hr, yn, qr, jr, Vr;
class xv {
  /// Create an inspector with container, clock and metadata.
  constructor(e, t, r) {
    /// @internal
    W(this, fo);
    /// @internal
    W(this, po);
    /// @internal
    W(this, mo);
    W(this, Wn);
    W(this, Hr);
    W(this, yn);
    W(this, qr);
    W(this, jr);
    W(this, Vr);
    P(this, Wn, /* @__PURE__ */ new Set()), P(this, Hr, /* @__PURE__ */ new Set()), P(this, yn, /* @__PURE__ */ new Map()), P(this, qr, /* @__PURE__ */ new Map()), this.read = () => ({
      metadata: v(this, fo),
      injectedSlices: [...v(this, Wn)].map((i) => ({
        name: typeof i == "string" ? i : i.name,
        value: v(this, jr).call(this, i)
      })),
      consumedSlices: [...v(this, Hr)].map((i) => ({
        name: typeof i == "string" ? i : i.name,
        value: v(this, jr).call(this, i)
      })),
      recordedTimers: [...v(this, yn)].map(
        ([i, { duration: o }]) => ({
          name: i.name,
          duration: o,
          status: v(this, Vr).call(this, i)
        })
      ),
      waitTimers: [...v(this, qr)].map(([i, { duration: o }]) => ({
        name: i.name,
        duration: o,
        status: v(this, Vr).call(this, i)
      }))
    }), this.onRecord = (i) => {
      v(this, yn).set(i, { start: Date.now(), duration: 0 });
    }, this.onClear = (i) => {
      v(this, yn).delete(i);
    }, this.onDone = (i) => {
      const o = v(this, yn).get(i);
      o && (o.duration = Date.now() - o.start);
    }, this.onWait = (i, o) => {
      const s = Date.now();
      o.finally(() => {
        v(this, qr).set(i, { duration: Date.now() - s });
      }).catch(console.error);
    }, this.onInject = (i) => {
      v(this, Wn).add(i);
    }, this.onRemove = (i) => {
      v(this, Wn).delete(i);
    }, this.onUse = (i) => {
      v(this, Hr).add(i);
    }, P(this, jr, (i) => v(this, po).get(i).get()), P(this, Vr, (i) => v(this, mo).get(i).status), P(this, po, e), P(this, mo, t), P(this, fo, r);
  }
}
fo = new WeakMap(), po = new WeakMap(), mo = new WeakMap(), Wn = new WeakMap(), Hr = new WeakMap(), yn = new WeakMap(), qr = new WeakMap(), jr = new WeakMap(), Vr = new WeakMap();
var Kt, Jt, go, lt;
const hd = class hd {
  /// Create a ctx object with container and clock.
  constructor(e, t, r) {
    /// @internal
    W(this, Kt);
    /// @internal
    W(this, Jt);
    /// @internal
    W(this, go);
    /// @internal
    W(this, lt);
    this.produce = (i) => i && Object.keys(i).length ? new hd(v(this, Kt), v(this, Jt), { ...i }) : this, this.inject = (i, o) => {
      const s = i.create(v(this, Kt).sliceMap);
      return o != null && s.set(o), v(this, lt)?.onInject(i), this;
    }, this.remove = (i) => (v(this, Kt).remove(i), v(this, lt)?.onRemove(i), this), this.record = (i) => (i.create(v(this, Jt).store), v(this, lt)?.onRecord(i), this), this.clearTimer = (i) => (v(this, Jt).remove(i), v(this, lt)?.onClear(i), this), this.isInjected = (i) => v(this, Kt).has(i), this.isRecorded = (i) => v(this, Jt).has(i), this.use = (i) => (v(this, lt)?.onUse(i), v(this, Kt).get(i)), this.get = (i) => this.use(i).get(), this.set = (i, o) => this.use(i).set(o), this.update = (i, o) => this.use(i).update(o), this.timer = (i) => v(this, Jt).get(i), this.done = (i) => {
      this.timer(i).done(), v(this, lt)?.onDone(i);
    }, this.wait = (i) => {
      const o = this.timer(i).start();
      return v(this, lt)?.onWait(i, o), o;
    }, this.waitTimers = async (i) => {
      await Promise.all(this.get(i).map((o) => this.wait(o)));
    }, P(this, Kt, e), P(this, Jt, t), P(this, go, r), r && P(this, lt, new xv(e, t, r));
  }
  /// Get metadata of the ctx.
  get meta() {
    return v(this, go);
  }
  /// Get the inspector of the ctx.
  get inspector() {
    return v(this, lt);
  }
};
Kt = new WeakMap(), Jt = new WeakMap(), go = new WeakMap(), lt = new WeakMap();
let Ya = hd;
class vv {
  constructor() {
    this.store = /* @__PURE__ */ new Map(), this.get = (e) => {
      const t = this.store.get(e.id);
      if (!t) throw mv(e.name);
      return t;
    }, this.remove = (e) => {
      this.store.delete(e.id);
    }, this.has = (e) => this.store.has(e.id);
  }
}
var Ur, bn, Wr, Gt, Kr, yo;
class Ev {
  /// @internal
  constructor(e, t) {
    W(this, Ur);
    W(this, bn);
    /// @internal
    W(this, Wr);
    W(this, Gt);
    W(this, Kr);
    W(this, yo);
    P(this, Ur, null), P(this, bn, null), P(this, Gt, "pending"), this.start = () => (v(this, Ur) ?? P(this, Ur, new Promise((r, i) => {
      P(this, bn, (o) => {
        o instanceof CustomEvent && o.detail.id === v(this, Wr) && (P(this, Gt, "resolved"), v(this, Kr).call(this), o.stopImmediatePropagation(), r());
      }), v(this, yo).call(this, () => {
        v(this, Gt) === "pending" && P(this, Gt, "rejected"), v(this, Kr).call(this), i(new Error(`Timing ${this.type.name} timeout.`));
      }), P(this, Gt, "pending"), addEventListener(this.type.name, v(this, bn));
    })), v(this, Ur)), this.done = () => {
      const r = new CustomEvent(this.type.name, {
        detail: { id: v(this, Wr) }
      });
      dispatchEvent(r);
    }, P(this, Kr, () => {
      v(this, bn) && removeEventListener(this.type.name, v(this, bn));
    }), P(this, yo, (r) => {
      setTimeout(() => {
        r();
      }, this.type.timeout);
    }), P(this, Wr, Symbol(t.name)), this.type = t, e.set(t.id, this);
  }
  /// The status of the timer.
  /// Can be `pending`, `resolved` or `rejected`.
  get status() {
    return v(this, Gt);
  }
}
Ur = new WeakMap(), bn = new WeakMap(), Wr = new WeakMap(), Gt = new WeakMap(), Kr = new WeakMap(), yo = new WeakMap();
class Mv {
  /// Create a timer type with a name and a timeout.
  /// The name should be unique in the clock.
  constructor(e, t = 3e3) {
    this.create = (r) => new Ev(r, this), this.id = Symbol(`Timer-${e}`), this.name = e, this.timeout = t;
  }
}
const Bt = (n, e = 3e3) => new Mv(n, e);
function Me(n) {
  this.content = n;
}
Me.prototype = {
  constructor: Me,
  find: function(n) {
    for (var e = 0; e < this.content.length; e += 2)
      if (this.content[e] === n) return e;
    return -1;
  },
  // :: (string) → ?any
  // Retrieve the value stored under `key`, or return undefined when
  // no such key exists.
  get: function(n) {
    var e = this.find(n);
    return e == -1 ? void 0 : this.content[e + 1];
  },
  // :: (string, any, ?string) → OrderedMap
  // Create a new map by replacing the value of `key` with a new
  // value, or adding a binding to the end of the map. If `newKey` is
  // given, the key of the binding will be replaced with that key.
  update: function(n, e, t) {
    var r = t && t != n ? this.remove(t) : this, i = r.find(n), o = r.content.slice();
    return i == -1 ? o.push(t || n, e) : (o[i + 1] = e, t && (o[i] = t)), new Me(o);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(n) {
    var e = this.find(n);
    if (e == -1) return this;
    var t = this.content.slice();
    return t.splice(e, 2), new Me(t);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(n, e) {
    return new Me([n, e].concat(this.remove(n).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(n, e) {
    var t = this.remove(n).content.slice();
    return t.push(n, e), new Me(t);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(n, e, t) {
    var r = this.remove(e), i = r.content.slice(), o = r.find(n);
    return i.splice(o == -1 ? i.length : o, 0, e, t), new Me(i);
  },
  // :: ((key: string, value: any))
  // Call the given function for each key/value pair in the map, in
  // order.
  forEach: function(n) {
    for (var e = 0; e < this.content.length; e += 2)
      n(this.content[e], this.content[e + 1]);
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by prepending the keys in this map that don't
  // appear in `map` before the keys in `map`.
  prepend: function(n) {
    return n = Me.from(n), n.size ? new Me(n.content.concat(this.subtract(n).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(n) {
    return n = Me.from(n), n.size ? new Me(this.subtract(n).content.concat(n.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(n) {
    var e = this;
    n = Me.from(n);
    for (var t = 0; t < n.content.length; t += 2)
      e = e.remove(n.content[t]);
    return e;
  },
  // :: () → Object
  // Turn ordered map into a plain object.
  toObject: function() {
    var n = {};
    return this.forEach(function(e, t) {
      n[e] = t;
    }), n;
  },
  // :: number
  // The amount of keys in this map.
  get size() {
    return this.content.length >> 1;
  }
};
Me.from = function(n) {
  if (n instanceof Me) return n;
  var e = [];
  if (n) for (var t in n) e.push(t, n[t]);
  return new Me(e);
};
function um(n, e, t) {
  for (let r = 0; ; r++) {
    if (r == n.childCount || r == e.childCount)
      return n.childCount == e.childCount ? null : t;
    let i = n.child(r), o = e.child(r);
    if (i == o) {
      t += i.nodeSize;
      continue;
    }
    if (!i.sameMarkup(o))
      return t;
    if (i.isText && i.text != o.text) {
      for (let s = 0; i.text[s] == o.text[s]; s++)
        t++;
      return t;
    }
    if (i.content.size || o.content.size) {
      let s = um(i.content, o.content, t + 1);
      if (s != null)
        return s;
    }
    t += i.nodeSize;
  }
}
function dm(n, e, t, r) {
  for (let i = n.childCount, o = e.childCount; ; ) {
    if (i == 0 || o == 0)
      return i == o ? null : { a: t, b: r };
    let s = n.child(--i), l = e.child(--o), a = s.nodeSize;
    if (s == l) {
      t -= a, r -= a;
      continue;
    }
    if (!s.sameMarkup(l))
      return { a: t, b: r };
    if (s.isText && s.text != l.text) {
      let c = 0, u = Math.min(s.text.length, l.text.length);
      for (; c < u && s.text[s.text.length - c - 1] == l.text[l.text.length - c - 1]; )
        c++, t--, r--;
      return { a: t, b: r };
    }
    if (s.content.size || l.content.size) {
      let c = dm(s.content, l.content, t - 1, r - 1);
      if (c)
        return c;
    }
    t -= a, r -= a;
  }
}
class N {
  /**
  @internal
  */
  constructor(e, t) {
    if (this.content = e, this.size = t || 0, t == null)
      for (let r = 0; r < e.length; r++)
        this.size += e[r].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(e, t, r, i = 0, o) {
    for (let s = 0, l = 0; l < t; s++) {
      let a = this.content[s], c = l + a.nodeSize;
      if (c > e && r(a, i + l, o || null, s) !== !1 && a.content.size) {
        let u = l + 1;
        a.nodesBetween(Math.max(0, e - u), Math.min(a.content.size, t - u), r, i + u);
      }
      l = c;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(e) {
    this.nodesBetween(0, this.size, e);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(e, t, r, i) {
    let o = "", s = !0;
    return this.nodesBetween(e, t, (l, a) => {
      let c = l.isText ? l.text.slice(Math.max(e, a) - a, t - a) : l.isLeaf ? i ? typeof i == "function" ? i(l) : i : l.type.spec.leafText ? l.type.spec.leafText(l) : "" : "";
      l.isBlock && (l.isLeaf && c || l.isTextblock) && r && (s ? s = !1 : o += r), o += c;
    }, 0), o;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(e) {
    if (!e.size)
      return this;
    if (!this.size)
      return e;
    let t = this.lastChild, r = e.firstChild, i = this.content.slice(), o = 0;
    for (t.isText && t.sameMarkup(r) && (i[i.length - 1] = t.withText(t.text + r.text), o = 1); o < e.content.length; o++)
      i.push(e.content[o]);
    return new N(i, this.size + e.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(e, t = this.size) {
    if (e == 0 && t == this.size)
      return this;
    let r = [], i = 0;
    if (t > e)
      for (let o = 0, s = 0; s < t; o++) {
        let l = this.content[o], a = s + l.nodeSize;
        a > e && ((s < e || a > t) && (l.isText ? l = l.cut(Math.max(0, e - s), Math.min(l.text.length, t - s)) : l = l.cut(Math.max(0, e - s - 1), Math.min(l.content.size, t - s - 1))), r.push(l), i += l.nodeSize), s = a;
      }
    return new N(r, i);
  }
  /**
  @internal
  */
  cutByIndex(e, t) {
    return e == t ? N.empty : e == 0 && t == this.content.length ? this : new N(this.content.slice(e, t));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(e, t) {
    let r = this.content[e];
    if (r == t)
      return this;
    let i = this.content.slice(), o = this.size + t.nodeSize - r.nodeSize;
    return i[e] = t, new N(i, o);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(e) {
    return new N([e].concat(this.content), this.size + e.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(e) {
    return new N(this.content.concat(e), this.size + e.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(e) {
    if (this.content.length != e.content.length)
      return !1;
    for (let t = 0; t < this.content.length; t++)
      if (!this.content[t].eq(e.content[t]))
        return !1;
    return !0;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(e) {
    let t = this.content[e];
    if (!t)
      throw new RangeError("Index " + e + " out of range for " + this);
    return t;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(e) {
    return this.content[e] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(e) {
    for (let t = 0, r = 0; t < this.content.length; t++) {
      let i = this.content[t];
      e(i, r, t), r += i.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(e, t = 0) {
    return um(this, e, t);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, t = this.size, r = e.size) {
    return dm(this, e, t, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Go(0, e);
    if (e == this.size)
      return Go(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let t = 0, r = 0; ; t++) {
      let i = this.child(t), o = r + i.nodeSize;
      if (o >= e)
        return o == e ? Go(t + 1, o) : Go(t, r);
      r = o;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((e) => e.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(e, t) {
    if (!t)
      return N.empty;
    if (!Array.isArray(t))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return new N(t.map(e.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(e) {
    if (!e.length)
      return N.empty;
    let t, r = 0;
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      r += o.nodeSize, i && o.isText && e[i - 1].sameMarkup(o) ? (t || (t = e.slice(0, i)), t[t.length - 1] = o.withText(t[t.length - 1].text + o.text)) : t && t.push(o);
    }
    return new N(t || e, r);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(e) {
    if (!e)
      return N.empty;
    if (e instanceof N)
      return e;
    if (Array.isArray(e))
      return this.fromArray(e);
    if (e.attrs)
      return new N([e], e.nodeSize);
    throw new RangeError("Can not convert " + e + " to a Fragment" + (e.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
}
N.empty = new N([], 0);
const Xl = { index: 0, offset: 0 };
function Go(n, e) {
  return Xl.index = n, Xl.offset = e, Xl;
}
function zs(n, e) {
  if (n === e)
    return !0;
  if (!(n && typeof n == "object") || !(e && typeof e == "object"))
    return !1;
  let t = Array.isArray(n);
  if (Array.isArray(e) != t)
    return !1;
  if (t) {
    if (n.length != e.length)
      return !1;
    for (let r = 0; r < n.length; r++)
      if (!zs(n[r], e[r]))
        return !1;
  } else {
    for (let r in n)
      if (!(r in e) || !zs(n[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in n))
        return !1;
  }
  return !0;
}
class ee {
  /**
  @internal
  */
  constructor(e, t) {
    this.type = e, this.attrs = t;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(e) {
    let t, r = !1;
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      if (this.eq(o))
        return e;
      if (this.type.excludes(o.type))
        t || (t = e.slice(0, i));
      else {
        if (o.type.excludes(this.type))
          return e;
        !r && o.type.rank > this.type.rank && (t || (t = e.slice(0, i)), t.push(this), r = !0), t && t.push(o);
      }
    }
    return t || (t = e.slice()), r || t.push(this), t;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(e) {
    for (let t = 0; t < e.length; t++)
      if (this.eq(e[t]))
        return e.slice(0, t).concat(e.slice(t + 1));
    return e;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(e) {
    for (let t = 0; t < e.length; t++)
      if (this.eq(e[t]))
        return !0;
    return !1;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(e) {
    return this == e || this.type == e.type && zs(this.attrs, e.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let e = { type: this.type.name };
    for (let t in this.attrs) {
      e.attrs = this.attrs;
      break;
    }
    return e;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(e, t) {
    if (!t)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let r = e.marks[t.type];
    if (!r)
      throw new RangeError(`There is no mark type ${t.type} in this schema`);
    let i = r.create(t.attrs);
    return r.checkAttrs(i.attrs), i;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(e, t) {
    if (e == t)
      return !0;
    if (e.length != t.length)
      return !1;
    for (let r = 0; r < e.length; r++)
      if (!e[r].eq(t[r]))
        return !1;
    return !0;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(e) {
    if (!e || Array.isArray(e) && e.length == 0)
      return ee.none;
    if (e instanceof ee)
      return [e];
    let t = e.slice();
    return t.sort((r, i) => r.type.rank - i.type.rank), t;
  }
}
ee.none = [];
class Fs extends Error {
}
class R {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.
  
  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(e, t, r) {
    this.content = e, this.openStart = t, this.openEnd = r;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(e, t) {
    let r = fm(this.content, e + this.openStart, t);
    return r && new R(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, t) {
    return new R(hm(this.content, e + this.openStart, t + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(e) {
    return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let e = { content: this.content.toJSON() };
    return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(e, t) {
    if (!t)
      return R.empty;
    let r = t.openStart || 0, i = t.openEnd || 0;
    if (typeof r != "number" || typeof i != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new R(N.fromJSON(e, t.content), r, i);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(e, t = !0) {
    let r = 0, i = 0;
    for (let o = e.firstChild; o && !o.isLeaf && (t || !o.type.spec.isolating); o = o.firstChild)
      r++;
    for (let o = e.lastChild; o && !o.isLeaf && (t || !o.type.spec.isolating); o = o.lastChild)
      i++;
    return new R(e, r, i);
  }
}
R.empty = new R(N.empty, 0, 0);
function hm(n, e, t) {
  let { index: r, offset: i } = n.findIndex(e), o = n.maybeChild(r), { index: s, offset: l } = n.findIndex(t);
  if (i == e || o.isText) {
    if (l != t && !n.child(s).isText)
      throw new RangeError("Removing non-flat range");
    return n.cut(0, e).append(n.cut(t));
  }
  if (r != s)
    throw new RangeError("Removing non-flat range");
  return n.replaceChild(r, o.copy(hm(o.content, e - i - 1, t - i - 1)));
}
function fm(n, e, t, r) {
  let { index: i, offset: o } = n.findIndex(e), s = n.maybeChild(i);
  if (o == e || s.isText)
    return r && !r.canReplace(i, i, t) ? null : n.cut(0, e).append(t).append(n.cut(e));
  let l = fm(s.content, e - o - 1, t, s);
  return l && n.replaceChild(i, s.copy(l));
}
function Tv(n, e, t) {
  if (t.openStart > n.depth)
    throw new Fs("Inserted content deeper than insertion position");
  if (n.depth - t.openStart != e.depth - t.openEnd)
    throw new Fs("Inconsistent open depths");
  return pm(n, e, t, 0);
}
function pm(n, e, t, r) {
  let i = n.index(r), o = n.node(r);
  if (i == e.index(r) && r < n.depth - t.openStart) {
    let s = pm(n, e, t, r + 1);
    return o.copy(o.content.replaceChild(i, s));
  } else if (t.content.size)
    if (!t.openStart && !t.openEnd && n.depth == r && e.depth == r) {
      let s = n.parent, l = s.content;
      return Zn(s, l.cut(0, n.parentOffset).append(t.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: s, end: l } = Nv(t, n);
      return Zn(o, gm(n, s, l, e, r));
    }
  else return Zn(o, _s(n, e, r));
}
function mm(n, e) {
  if (!e.type.compatibleContent(n.type))
    throw new Fs("Cannot join " + e.type.name + " onto " + n.type.name);
}
function Xa(n, e, t) {
  let r = n.node(t);
  return mm(r, e.node(t)), r;
}
function Qn(n, e) {
  let t = e.length - 1;
  t >= 0 && n.isText && n.sameMarkup(e[t]) ? e[t] = n.withText(e[t].text + n.text) : e.push(n);
}
function Fi(n, e, t, r) {
  let i = (e || n).node(t), o = 0, s = e ? e.index(t) : i.childCount;
  n && (o = n.index(t), n.depth > t ? o++ : n.textOffset && (Qn(n.nodeAfter, r), o++));
  for (let l = o; l < s; l++)
    Qn(i.child(l), r);
  e && e.depth == t && e.textOffset && Qn(e.nodeBefore, r);
}
function Zn(n, e) {
  return n.type.checkContent(e), n.copy(e);
}
function gm(n, e, t, r, i) {
  let o = n.depth > i && Xa(n, e, i + 1), s = r.depth > i && Xa(t, r, i + 1), l = [];
  return Fi(null, n, i, l), o && s && e.index(i) == t.index(i) ? (mm(o, s), Qn(Zn(o, gm(n, e, t, r, i + 1)), l)) : (o && Qn(Zn(o, _s(n, e, i + 1)), l), Fi(e, t, i, l), s && Qn(Zn(s, _s(t, r, i + 1)), l)), Fi(r, null, i, l), new N(l);
}
function _s(n, e, t) {
  let r = [];
  if (Fi(null, n, t, r), n.depth > t) {
    let i = Xa(n, e, t + 1);
    Qn(Zn(i, _s(n, e, t + 1)), r);
  }
  return Fi(e, null, t, r), new N(r);
}
function Nv(n, e) {
  let t = e.depth - n.openStart, i = e.node(t).copy(n.content);
  for (let o = t - 1; o >= 0; o--)
    i = e.node(o).copy(N.from(i));
  return {
    start: i.resolveNoCache(n.openStart + t),
    end: i.resolveNoCache(i.content.size - n.openEnd - t)
  };
}
class eo {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.pos = e, this.path = t, this.parentOffset = r, this.depth = t.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(e) {
    return e == null ? this.depth : e < 0 ? this.depth + e : e;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(e) {
    return this.path[this.resolveDepth(e) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(e) {
    return this.path[this.resolveDepth(e) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(e) {
    return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(e) {
    return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(e) {
    return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(e) {
    if (e = this.resolveDepth(e), !e)
      throw new RangeError("There is no position before the top-level node");
    return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(e) {
    if (e = this.resolveDepth(e), !e)
      throw new RangeError("There is no position after the top-level node");
    return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let e = this.parent, t = this.index(this.depth);
    if (t == e.childCount)
      return null;
    let r = this.pos - this.path[this.path.length - 1], i = e.child(t);
    return r ? e.child(t).cut(r) : i;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let e = this.index(this.depth), t = this.pos - this.path[this.path.length - 1];
    return t ? this.parent.child(e).cut(0, t) : e == 0 ? null : this.parent.child(e - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(e, t) {
    t = this.resolveDepth(t);
    let r = this.path[t * 3], i = t == 0 ? 0 : this.path[t * 3 - 1] + 1;
    for (let o = 0; o < e; o++)
      i += r.child(o).nodeSize;
    return i;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let e = this.parent, t = this.index();
    if (e.content.size == 0)
      return ee.none;
    if (this.textOffset)
      return e.child(t).marks;
    let r = e.maybeChild(t - 1), i = e.maybeChild(t);
    if (!r) {
      let l = r;
      r = i, i = l;
    }
    let o = r.marks;
    for (var s = 0; s < o.length; s++)
      o[s].type.spec.inclusive === !1 && (!i || !o[s].isInSet(i.marks)) && (o = o[s--].removeFromSet(o));
    return o;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross(e) {
    let t = this.parent.maybeChild(this.index());
    if (!t || !t.isInline)
      return null;
    let r = t.marks, i = e.parent.maybeChild(e.index());
    for (var o = 0; o < r.length; o++)
      r[o].type.spec.inclusive === !1 && (!i || !r[o].isInSet(i.marks)) && (r = r[o--].removeFromSet(r));
    return r;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(e) {
    for (let t = this.depth; t > 0; t--)
      if (this.start(t) <= e && this.end(t) >= e)
        return t;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(e = this, t) {
    if (e.pos < this.pos)
      return e.blockRange(this);
    for (let r = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); r >= 0; r--)
      if (e.pos <= this.end(r) && (!t || t(this.node(r))))
        return new ym(this, e, r);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(e) {
    return this.pos - this.parentOffset == e.pos - e.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(e) {
    return e.pos > this.pos ? e : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(e) {
    return e.pos < this.pos ? e : this;
  }
  /**
  @internal
  */
  toString() {
    let e = "";
    for (let t = 1; t <= this.depth; t++)
      e += (e ? "/" : "") + this.node(t).type.name + "_" + this.index(t - 1);
    return e + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(e, t) {
    if (!(t >= 0 && t <= e.content.size))
      throw new RangeError("Position " + t + " out of range");
    let r = [], i = 0, o = t;
    for (let s = e; ; ) {
      let { index: l, offset: a } = s.content.findIndex(o), c = o - a;
      if (r.push(s, l, i + a), !c || (s = s.child(l), s.isText))
        break;
      o = c - 1, i += a + 1;
    }
    return new eo(t, r, o);
  }
  /**
  @internal
  */
  static resolveCached(e, t) {
    let r = yh.get(e);
    if (r)
      for (let o = 0; o < r.elts.length; o++) {
        let s = r.elts[o];
        if (s.pos == t)
          return s;
      }
    else
      yh.set(e, r = new Iv());
    let i = r.elts[r.i] = eo.resolve(e, t);
    return r.i = (r.i + 1) % Av, i;
  }
}
class Iv {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const Av = 12, yh = /* @__PURE__ */ new WeakMap();
class ym {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor(e, t, r) {
    this.$from = e, this.$to = t, this.depth = r;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
}
const Ov = /* @__PURE__ */ Object.create(null);
class ht {
  /**
  @internal
  */
  constructor(e, t, r, i = ee.none) {
    this.type = e, this.attrs = t, this.marks = i, this.content = r || N.empty;
  }
  /**
  The array of this node's child nodes.
  */
  get children() {
    return this.content.content;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](https://prosemirror.net/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(e) {
    return this.content.child(e);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(e) {
    return this.content.maybeChild(e);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(e) {
    this.content.forEach(e);
  }
  /**
  Invoke a callback for all descendant nodes recursively between
  the given two positions that are relative to start of this
  node's content. The callback is invoked with the node, its
  position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(e, t, r, i = 0) {
    this.content.nodesBetween(e, t, r, i, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(e) {
    this.nodesBetween(0, this.content.size, e);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec.leafText) will be used.
  */
  textBetween(e, t, r, i) {
    return this.content.textBetween(e, t, r, i);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(e) {
    return this == e || this.sameMarkup(e) && this.content.eq(e.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(e) {
    return this.hasMarkup(e.type, e.attrs, e.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(e, t, r) {
    return this.type == e && zs(this.attrs, t || e.defaultAttrs || Ov) && ee.sameSet(this.marks, r || ee.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new ht(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new ht(this.type, this.attrs, this.content, e);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(e, t = this.content.size) {
    return e == 0 && t == this.content.size ? this : this.copy(this.content.cut(e, t));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(e, t = this.content.size, r = !1) {
    if (e == t)
      return R.empty;
    let i = this.resolve(e), o = this.resolve(t), s = r ? 0 : i.sharedDepth(t), l = i.start(s), c = i.node(s).content.cut(i.pos - l, o.pos - l);
    return new R(c, i.depth - s, o.depth - s);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(e, t, r) {
    return Tv(this.resolve(e), this.resolve(t), r);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(e) {
    for (let t = this; ; ) {
      let { index: r, offset: i } = t.content.findIndex(e);
      if (t = t.maybeChild(r), !t)
        return null;
      if (i == e || t.isText)
        return t;
      e -= i + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(e) {
    let { index: t, offset: r } = this.content.findIndex(e);
    return { node: this.content.maybeChild(t), index: t, offset: r };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(e) {
    if (e == 0)
      return { node: null, index: 0, offset: 0 };
    let { index: t, offset: r } = this.content.findIndex(e);
    if (r < e)
      return { node: this.content.child(t), index: t, offset: r };
    let i = this.content.child(t - 1);
    return { node: i, index: t - 1, offset: r - i.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(e) {
    return eo.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return eo.resolve(this, e);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(e, t, r) {
    let i = !1;
    return t > e && this.nodesBetween(e, t, (o) => (r.isInSet(o.marks) && (i = !0), !i)), i;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let e = this.type.name;
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), bm(this.marks, e);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(e) {
    let t = this.type.contentMatch.matchFragment(this.content, 0, e);
    if (!t)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return t;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(e, t, r = N.empty, i = 0, o = r.childCount) {
    let s = this.contentMatchAt(e).matchFragment(r, i, o), l = s && s.matchFragment(this.content, t);
    if (!l || !l.validEnd)
      return !1;
    for (let a = i; a < o; a++)
      if (!this.type.allowsMarks(r.child(a).marks))
        return !1;
    return !0;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(e, t, r, i) {
    if (i && !this.type.allowsMarks(i))
      return !1;
    let o = this.contentMatchAt(e).matchType(r), s = o && o.matchFragment(this.content, t);
    return s ? s.validEnd : !1;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(e) {
    return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
    let e = ee.none;
    for (let t = 0; t < this.marks.length; t++) {
      let r = this.marks[t];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!ee.sameSet(e, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((t) => t.type.name)}`);
    this.content.forEach((t) => t.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let e = { type: this.type.name };
    for (let t in this.attrs) {
      e.attrs = this.attrs;
      break;
    }
    return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((t) => t.toJSON())), e;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(e, t) {
    if (!t)
      throw new RangeError("Invalid input for Node.fromJSON");
    let r;
    if (t.marks) {
      if (!Array.isArray(t.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      r = t.marks.map(e.markFromJSON);
    }
    if (t.type == "text") {
      if (typeof t.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return e.text(t.text, r);
    }
    let i = N.fromJSON(e, t.content), o = e.nodeType(t.type).create(t.attrs, i, r);
    return o.type.checkAttrs(o.attrs), o;
  }
}
ht.prototype.text = void 0;
class Hs extends ht {
  /**
  @internal
  */
  constructor(e, t, r, i) {
    if (super(e, t, null, i), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : bm(this.marks, JSON.stringify(this.text));
  }
  get textContent() {
    return this.text;
  }
  textBetween(e, t) {
    return this.text.slice(e, t);
  }
  get nodeSize() {
    return this.text.length;
  }
  mark(e) {
    return e == this.marks ? this : new Hs(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new Hs(this.type, this.attrs, e, this.marks);
  }
  cut(e = 0, t = this.text.length) {
    return e == 0 && t == this.text.length ? this : this.withText(this.text.slice(e, t));
  }
  eq(e) {
    return this.sameMarkup(e) && this.text == e.text;
  }
  toJSON() {
    let e = super.toJSON();
    return e.text = this.text, e;
  }
}
function bm(n, e) {
  for (let t = n.length - 1; t >= 0; t--)
    e = n[t].type.name + "(" + e + ")";
  return e;
}
class lr {
  /**
  @internal
  */
  constructor(e) {
    this.validEnd = e, this.next = [], this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(e, t) {
    let r = new Rv(e, t);
    if (r.next == null)
      return lr.empty;
    let i = km(r);
    r.next && r.err("Unexpected trailing text");
    let o = Fv(zv(i));
    return _v(o, r), o;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(e) {
    for (let t = 0; t < this.next.length; t++)
      if (this.next[t].type == e)
        return this.next[t].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(e, t = 0, r = e.childCount) {
    let i = this;
    for (let o = t; i && o < r; o++)
      i = i.matchType(e.child(o).type);
    return i;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let e = 0; e < this.next.length; e++) {
      let { type: t } = this.next[e];
      if (!(t.isText || t.hasRequiredAttrs()))
        return t;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(e) {
    for (let t = 0; t < this.next.length; t++)
      for (let r = 0; r < e.next.length; r++)
        if (this.next[t].type == e.next[r].type)
          return !0;
    return !1;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(e, t = !1, r = 0) {
    let i = [this];
    function o(s, l) {
      let a = s.matchFragment(e, r);
      if (a && (!t || a.validEnd))
        return N.from(l.map((c) => c.createAndFill()));
      for (let c = 0; c < s.next.length; c++) {
        let { type: u, next: d } = s.next[c];
        if (!(u.isText || u.hasRequiredAttrs()) && i.indexOf(d) == -1) {
          i.push(d);
          let h = o(d, l.concat(u));
          if (h)
            return h;
        }
      }
      return null;
    }
    return o(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(e) {
    for (let r = 0; r < this.wrapCache.length; r += 2)
      if (this.wrapCache[r] == e)
        return this.wrapCache[r + 1];
    let t = this.computeWrapping(e);
    return this.wrapCache.push(e, t), t;
  }
  /**
  @internal
  */
  computeWrapping(e) {
    let t = /* @__PURE__ */ Object.create(null), r = [{ match: this, type: null, via: null }];
    for (; r.length; ) {
      let i = r.shift(), o = i.match;
      if (o.matchType(e)) {
        let s = [];
        for (let l = i; l.type; l = l.via)
          s.push(l.type);
        return s.reverse();
      }
      for (let s = 0; s < o.next.length; s++) {
        let { type: l, next: a } = o.next[s];
        !l.isLeaf && !l.hasRequiredAttrs() && !(l.name in t) && (!i.type || a.validEnd) && (r.push({ match: l.contentMatch, type: l, via: i }), t[l.name] = !0);
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(e) {
    if (e >= this.next.length)
      throw new RangeError(`There's no ${e}th edge in this content match`);
    return this.next[e];
  }
  /**
  @internal
  */
  toString() {
    let e = [];
    function t(r) {
      e.push(r);
      for (let i = 0; i < r.next.length; i++)
        e.indexOf(r.next[i].next) == -1 && t(r.next[i].next);
    }
    return t(this), e.map((r, i) => {
      let o = i + (r.validEnd ? "*" : " ") + " ";
      for (let s = 0; s < r.next.length; s++)
        o += (s ? ", " : "") + r.next[s].type.name + "->" + e.indexOf(r.next[s].next);
      return o;
    }).join(`
`);
  }
}
lr.empty = new lr(!0);
class Rv {
  constructor(e, t) {
    this.string = e, this.nodeTypes = t, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(e) {
    return this.next == e && (this.pos++ || !0);
  }
  err(e) {
    throw new SyntaxError(e + " (in content expression '" + this.string + "')");
  }
}
function km(n) {
  let e = [];
  do
    e.push(Dv(n));
  while (n.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function Dv(n) {
  let e = [];
  do
    e.push(Lv(n));
  while (n.next && n.next != ")" && n.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function Lv(n) {
  let e = $v(n);
  for (; ; )
    if (n.eat("+"))
      e = { type: "plus", expr: e };
    else if (n.eat("*"))
      e = { type: "star", expr: e };
    else if (n.eat("?"))
      e = { type: "opt", expr: e };
    else if (n.eat("{"))
      e = Pv(n, e);
    else
      break;
  return e;
}
function bh(n) {
  /\D/.test(n.next) && n.err("Expected number, got '" + n.next + "'");
  let e = Number(n.next);
  return n.pos++, e;
}
function Pv(n, e) {
  let t = bh(n), r = t;
  return n.eat(",") && (n.next != "}" ? r = bh(n) : r = -1), n.eat("}") || n.err("Unclosed braced range"), { type: "range", min: t, max: r, expr: e };
}
function Bv(n, e) {
  let t = n.nodeTypes, r = t[e];
  if (r)
    return [r];
  let i = [];
  for (let o in t) {
    let s = t[o];
    s.isInGroup(e) && i.push(s);
  }
  return i.length == 0 && n.err("No node type or group '" + e + "' found"), i;
}
function $v(n) {
  if (n.eat("(")) {
    let e = km(n);
    return n.eat(")") || n.err("Missing closing paren"), e;
  } else if (/\W/.test(n.next))
    n.err("Unexpected token '" + n.next + "'");
  else {
    let e = Bv(n, n.next).map((t) => (n.inline == null ? n.inline = t.isInline : n.inline != t.isInline && n.err("Mixing inline and block content"), { type: "name", value: t }));
    return n.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function zv(n) {
  let e = [[]];
  return i(o(n, 0), t()), e;
  function t() {
    return e.push([]) - 1;
  }
  function r(s, l, a) {
    let c = { term: a, to: l };
    return e[s].push(c), c;
  }
  function i(s, l) {
    s.forEach((a) => a.to = l);
  }
  function o(s, l) {
    if (s.type == "choice")
      return s.exprs.reduce((a, c) => a.concat(o(c, l)), []);
    if (s.type == "seq")
      for (let a = 0; ; a++) {
        let c = o(s.exprs[a], l);
        if (a == s.exprs.length - 1)
          return c;
        i(c, l = t());
      }
    else if (s.type == "star") {
      let a = t();
      return r(l, a), i(o(s.expr, a), a), [r(a)];
    } else if (s.type == "plus") {
      let a = t();
      return i(o(s.expr, l), a), i(o(s.expr, a), a), [r(a)];
    } else {
      if (s.type == "opt")
        return [r(l)].concat(o(s.expr, l));
      if (s.type == "range") {
        let a = l;
        for (let c = 0; c < s.min; c++) {
          let u = t();
          i(o(s.expr, a), u), a = u;
        }
        if (s.max == -1)
          i(o(s.expr, a), a);
        else
          for (let c = s.min; c < s.max; c++) {
            let u = t();
            r(a, u), i(o(s.expr, a), u), a = u;
          }
        return [r(a)];
      } else {
        if (s.type == "name")
          return [r(l, void 0, s.value)];
        throw new Error("Unknown expr type");
      }
    }
  }
}
function wm(n, e) {
  return e - n;
}
function kh(n, e) {
  let t = [];
  return r(e), t.sort(wm);
  function r(i) {
    let o = n[i];
    if (o.length == 1 && !o[0].term)
      return r(o[0].to);
    t.push(i);
    for (let s = 0; s < o.length; s++) {
      let { term: l, to: a } = o[s];
      !l && t.indexOf(a) == -1 && r(a);
    }
  }
}
function Fv(n) {
  let e = /* @__PURE__ */ Object.create(null);
  return t(kh(n, 0));
  function t(r) {
    let i = [];
    r.forEach((s) => {
      n[s].forEach(({ term: l, to: a }) => {
        if (!l)
          return;
        let c;
        for (let u = 0; u < i.length; u++)
          i[u][0] == l && (c = i[u][1]);
        kh(n, a).forEach((u) => {
          c || i.push([l, c = []]), c.indexOf(u) == -1 && c.push(u);
        });
      });
    });
    let o = e[r.join(",")] = new lr(r.indexOf(n.length - 1) > -1);
    for (let s = 0; s < i.length; s++) {
      let l = i[s][1].sort(wm);
      o.next.push({ type: i[s][0], next: e[l.join(",")] || t(l) });
    }
    return o;
  }
}
function _v(n, e) {
  for (let t = 0, r = [n]; t < r.length; t++) {
    let i = r[t], o = !i.validEnd, s = [];
    for (let l = 0; l < i.next.length; l++) {
      let { type: a, next: c } = i.next[l];
      s.push(a.name), o && !(a.isText || a.hasRequiredAttrs()) && (o = !1), r.indexOf(c) == -1 && r.push(c);
    }
    o && e.err("Only non-generatable nodes (" + s.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function Cm(n) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let t in n) {
    let r = n[t];
    if (!r.hasDefault)
      return null;
    e[t] = r.default;
  }
  return e;
}
function Sm(n, e) {
  let t = /* @__PURE__ */ Object.create(null);
  for (let r in n) {
    let i = e && e[r];
    if (i === void 0) {
      let o = n[r];
      if (o.hasDefault)
        i = o.default;
      else
        throw new RangeError("No value supplied for attribute " + r);
    }
    t[r] = i;
  }
  return t;
}
function xm(n, e, t, r) {
  for (let i in e)
    if (!(i in n))
      throw new RangeError(`Unsupported attribute ${i} for ${t} of type ${i}`);
  for (let i in n) {
    let o = n[i];
    o.validate && o.validate(e[i]);
  }
}
function vm(n, e) {
  let t = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      t[r] = new qv(n, r, e[r]);
  return t;
}
let wh = class Em {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.name = e, this.schema = t, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = vm(e, r.attrs), this.defaultAttrs = Cm(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
  }
  /**
  True if this is an inline type.
  */
  get isInline() {
    return !this.isBlock;
  }
  /**
  True if this is a textblock type, a block that contains inline
  content.
  */
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  /**
  True for node types that allow no content.
  */
  get isLeaf() {
    return this.contentMatch == lr.empty;
  }
  /**
  True when this node is an atom, i.e. when it does not have
  directly editable content.
  */
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  /**
  Return true when this node type is part of the given
  [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
  */
  isInGroup(e) {
    return this.groups.indexOf(e) > -1;
  }
  /**
  The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
  */
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  /**
  Tells you whether this node type has any required attributes.
  */
  hasRequiredAttrs() {
    for (let e in this.attrs)
      if (this.attrs[e].isRequired)
        return !0;
    return !1;
  }
  /**
  Indicates whether this node allows some of the same content as
  the given node type.
  */
  compatibleContent(e) {
    return this == e || this.contentMatch.compatible(e.contentMatch);
  }
  /**
  @internal
  */
  computeAttrs(e) {
    return !e && this.defaultAttrs ? this.defaultAttrs : Sm(this.attrs, e);
  }
  /**
  Create a `Node` of this type. The given attributes are
  checked and defaulted (you can pass `null` to use the type's
  defaults entirely, if no required attributes exist). `content`
  may be a `Fragment`, a node, an array of nodes, or
  `null`. Similarly `marks` may be `null` to default to the empty
  set of marks.
  */
  create(e = null, t, r) {
    if (this.isText)
      throw new Error("NodeType.create can't construct text nodes");
    return new ht(this, this.computeAttrs(e), N.from(t), ee.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, t, r) {
    return t = N.from(t), this.checkContent(t), new ht(this, this.computeAttrs(e), t, ee.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
  necessary to add nodes to the start or end of the given fragment
  to make it fit the node. If no fitting wrapping can be found,
  return null. Note that, due to the fact that required nodes can
  always be created, this will always succeed if you pass null or
  `Fragment.empty` as content.
  */
  createAndFill(e = null, t, r) {
    if (e = this.computeAttrs(e), t = N.from(t), t.size) {
      let s = this.contentMatch.fillBefore(t);
      if (!s)
        return null;
      t = s.append(t);
    }
    let i = this.contentMatch.matchFragment(t), o = i && i.fillBefore(N.empty, !0);
    return o ? new ht(this, e, t.append(o), ee.setFrom(r)) : null;
  }
  /**
  Returns true if the given fragment is valid content for this node
  type.
  */
  validContent(e) {
    let t = this.contentMatch.matchFragment(e);
    if (!t || !t.validEnd)
      return !1;
    for (let r = 0; r < e.childCount; r++)
      if (!this.allowsMarks(e.child(r).marks))
        return !1;
    return !0;
  }
  /**
  Throws a RangeError if the given fragment is not valid content for this
  node type.
  @internal
  */
  checkContent(e) {
    if (!this.validContent(e))
      throw new RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
  }
  /**
  @internal
  */
  checkAttrs(e) {
    xm(this.attrs, e, "node", this.name);
  }
  /**
  Check whether the given mark type is allowed in this node.
  */
  allowsMarkType(e) {
    return this.markSet == null || this.markSet.indexOf(e) > -1;
  }
  /**
  Test whether the given set of marks are allowed in this node.
  */
  allowsMarks(e) {
    if (this.markSet == null)
      return !0;
    for (let t = 0; t < e.length; t++)
      if (!this.allowsMarkType(e[t].type))
        return !1;
    return !0;
  }
  /**
  Removes the marks that are not allowed in this node from the given set.
  */
  allowedMarks(e) {
    if (this.markSet == null)
      return e;
    let t;
    for (let r = 0; r < e.length; r++)
      this.allowsMarkType(e[r].type) ? t && t.push(e[r]) : t || (t = e.slice(0, r));
    return t ? t.length ? t : ee.none : e;
  }
  /**
  @internal
  */
  static compile(e, t) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((o, s) => r[o] = new Em(o, t, s));
    let i = t.spec.topNode || "doc";
    if (!r[i])
      throw new RangeError("Schema is missing its top node type ('" + i + "')");
    if (!r.text)
      throw new RangeError("Every schema needs a 'text' type");
    for (let o in r.text.attrs)
      throw new RangeError("The text node type should not have attributes");
    return r;
  }
};
function Hv(n, e, t) {
  let r = t.split("|");
  return (i) => {
    let o = i === null ? "null" : typeof i;
    if (r.indexOf(o) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${n}, got ${o}`);
  };
}
class qv {
  constructor(e, t, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? Hv(e, t, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class cl {
  /**
  @internal
  */
  constructor(e, t, r, i) {
    this.name = e, this.rank = t, this.schema = r, this.spec = i, this.attrs = vm(e, i.attrs), this.excluded = null;
    let o = Cm(this.attrs);
    this.instance = o ? new ee(this, o) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new ee(this, Sm(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, t) {
    let r = /* @__PURE__ */ Object.create(null), i = 0;
    return e.forEach((o, s) => r[o] = new cl(o, i++, t, s)), r;
  }
  /**
  When there is a mark of this type in the given set, a new set
  without it is returned. Otherwise, the input set is returned.
  */
  removeFromSet(e) {
    for (var t = 0; t < e.length; t++)
      e[t].type == this && (e = e.slice(0, t).concat(e.slice(t + 1)), t--);
    return e;
  }
  /**
  Tests whether there is a mark of this type in the given set.
  */
  isInSet(e) {
    for (let t = 0; t < e.length; t++)
      if (e[t].type == this)
        return e[t];
  }
  /**
  @internal
  */
  checkAttrs(e) {
    xm(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class jv {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let t = this.spec = {};
    for (let i in e)
      t[i] = e[i];
    t.nodes = Me.from(e.nodes), t.marks = Me.from(e.marks || {}), this.nodes = wh.compile(this.spec.nodes, this), this.marks = cl.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in this.nodes) {
      if (i in this.marks)
        throw new RangeError(i + " can not be both a node and a mark");
      let o = this.nodes[i], s = o.spec.content || "", l = o.spec.marks;
      if (o.contentMatch = r[s] || (r[s] = lr.parse(s, this.nodes)), o.inlineContent = o.contentMatch.inlineContent, o.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!o.isInline || !o.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = o;
      }
      o.markSet = l == "_" ? null : l ? Ch(this, l.split(" ")) : l == "" || !o.inlineContent ? [] : null;
    }
    for (let i in this.marks) {
      let o = this.marks[i], s = o.spec.excludes;
      o.excluded = s == null ? [o] : s == "" ? [] : Ch(this, s.split(" "));
    }
    this.nodeFromJSON = (i) => ht.fromJSON(this, i), this.markFromJSON = (i) => ee.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
  }
  /**
  Create a node in this schema. The `type` may be a string or a
  `NodeType` instance. Attributes will be extended with defaults,
  `content` may be a `Fragment`, `null`, a `Node`, or an array of
  nodes.
  */
  node(e, t = null, r, i) {
    if (typeof e == "string")
      e = this.nodeType(e);
    else if (e instanceof wh) {
      if (e.schema != this)
        throw new RangeError("Node type from different schema used (" + e.name + ")");
    } else throw new RangeError("Invalid node type: " + e);
    return e.createChecked(t, r, i);
  }
  /**
  Create a text node in the schema. Empty text nodes are not
  allowed.
  */
  text(e, t) {
    let r = this.nodes.text;
    return new Hs(r, r.defaultAttrs, e, ee.setFrom(t));
  }
  /**
  Create a mark with the given type and attributes.
  */
  mark(e, t) {
    return typeof e == "string" && (e = this.marks[e]), e.create(t);
  }
  /**
  @internal
  */
  nodeType(e) {
    let t = this.nodes[e];
    if (!t)
      throw new RangeError("Unknown node type: " + e);
    return t;
  }
}
function Ch(n, e) {
  let t = [];
  for (let r = 0; r < e.length; r++) {
    let i = e[r], o = n.marks[i], s = o;
    if (o)
      t.push(o);
    else
      for (let l in n.marks) {
        let a = n.marks[l];
        (i == "_" || a.spec.group && a.spec.group.split(" ").indexOf(i) > -1) && t.push(s = a);
      }
    if (!s)
      throw new SyntaxError("Unknown mark type: '" + e[r] + "'");
  }
  return t;
}
function Vv(n) {
  return n.tag != null;
}
function Uv(n) {
  return n.style != null;
}
class Qr {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, t) {
    this.schema = e, this.rules = t, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    t.forEach((i) => {
      if (Vv(i))
        this.tags.push(i);
      else if (Uv(i)) {
        let o = /[^=]*/.exec(i.style)[0];
        r.indexOf(o) < 0 && r.push(o), this.styles.push(i);
      }
    }), this.normalizeLists = !this.tags.some((i) => {
      if (!/^(ul|ol)\b/.test(i.tag) || !i.node)
        return !1;
      let o = e.nodes[i.node];
      return o.contentMatch.matchType(o);
    });
  }
  /**
  Parse a document from the content of a DOM node.
  */
  parse(e, t = {}) {
    let r = new xh(this, t, !1);
    return r.addAll(e, ee.none, t.from, t.to), r.finish();
  }
  /**
  Parses the content of the given DOM node, like
  [`parse`](https://prosemirror.net/docs/ref/#model.DOMParser.parse), and takes the same set of
  options. But unlike that method, which produces a whole node,
  this one returns a slice that is open at the sides, meaning that
  the schema constraints aren't applied to the start of nodes to
  the left of the input and the end of nodes at the end.
  */
  parseSlice(e, t = {}) {
    let r = new xh(this, t, !0);
    return r.addAll(e, ee.none, t.from, t.to), R.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, t, r) {
    for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
      let o = this.tags[i];
      if (Jv(e, o.tag) && (o.namespace === void 0 || e.namespaceURI == o.namespace) && (!o.context || t.matchesContext(o.context))) {
        if (o.getAttrs) {
          let s = o.getAttrs(e);
          if (s === !1)
            continue;
          o.attrs = s || void 0;
        }
        return o;
      }
    }
  }
  /**
  @internal
  */
  matchStyle(e, t, r, i) {
    for (let o = i ? this.styles.indexOf(i) + 1 : 0; o < this.styles.length; o++) {
      let s = this.styles[o], l = s.style;
      if (!(l.indexOf(e) != 0 || s.context && !r.matchesContext(s.context) || // Test that the style string either precisely matches the prop,
      // or has an '=' sign after the prop, followed by the given
      // value.
      l.length > e.length && (l.charCodeAt(e.length) != 61 || l.slice(e.length + 1) != t))) {
        if (s.getAttrs) {
          let a = s.getAttrs(t);
          if (a === !1)
            continue;
          s.attrs = a || void 0;
        }
        return s;
      }
    }
  }
  /**
  @internal
  */
  static schemaRules(e) {
    let t = [];
    function r(i) {
      let o = i.priority == null ? 50 : i.priority, s = 0;
      for (; s < t.length; s++) {
        let l = t[s];
        if ((l.priority == null ? 50 : l.priority) < o)
          break;
      }
      t.splice(s, 0, i);
    }
    for (let i in e.marks) {
      let o = e.marks[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = vh(s)), s.mark || s.ignore || s.clearMark || (s.mark = i);
      });
    }
    for (let i in e.nodes) {
      let o = e.nodes[i].spec.parseDOM;
      o && o.forEach((s) => {
        r(s = vh(s)), s.node || s.ignore || s.mark || (s.node = i);
      });
    }
    return t;
  }
  /**
  Construct a DOM parser using the parsing rules listed in a
  schema's [node specs](https://prosemirror.net/docs/ref/#model.NodeSpec.parseDOM), reordered by
  [priority](https://prosemirror.net/docs/ref/#model.GenericParseRule.priority).
  */
  static fromSchema(e) {
    return e.cached.domParser || (e.cached.domParser = new Qr(e, Qr.schemaRules(e)));
  }
}
const Mm = {
  address: !0,
  article: !0,
  aside: !0,
  blockquote: !0,
  canvas: !0,
  dd: !0,
  div: !0,
  dl: !0,
  fieldset: !0,
  figcaption: !0,
  figure: !0,
  footer: !0,
  form: !0,
  h1: !0,
  h2: !0,
  h3: !0,
  h4: !0,
  h5: !0,
  h6: !0,
  header: !0,
  hgroup: !0,
  hr: !0,
  li: !0,
  noscript: !0,
  ol: !0,
  output: !0,
  p: !0,
  pre: !0,
  section: !0,
  table: !0,
  tfoot: !0,
  ul: !0
}, Wv = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, Tm = { ol: !0, ul: !0 }, to = 1, Qa = 2, _i = 4;
function Sh(n, e, t) {
  return e != null ? (e ? to : 0) | (e === "full" ? Qa : 0) : n && n.whitespace == "pre" ? to | Qa : t & ~_i;
}
class Yo {
  constructor(e, t, r, i, o, s) {
    this.type = e, this.attrs = t, this.marks = r, this.solid = i, this.options = s, this.content = [], this.activeMarks = ee.none, this.match = o || (s & _i ? null : e.contentMatch);
  }
  findWrapping(e) {
    if (!this.match) {
      if (!this.type)
        return [];
      let t = this.type.contentMatch.fillBefore(N.from(e));
      if (t)
        this.match = this.type.contentMatch.matchFragment(t);
      else {
        let r = this.type.contentMatch, i;
        return (i = r.findWrapping(e.type)) ? (this.match = r, i) : null;
      }
    }
    return this.match.findWrapping(e.type);
  }
  finish(e) {
    if (!(this.options & to)) {
      let r = this.content[this.content.length - 1], i;
      if (r && r.isText && (i = /[ \t\r\n\u000c]+$/.exec(r.text))) {
        let o = r;
        r.text.length == i[0].length ? this.content.pop() : this.content[this.content.length - 1] = o.withText(o.text.slice(0, o.text.length - i[0].length));
      }
    }
    let t = N.from(this.content);
    return !e && this.match && (t = t.append(this.match.fillBefore(N.empty, !0))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
  }
  inlineContext(e) {
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Mm.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class xh {
  constructor(e, t, r) {
    this.parser = e, this.options = t, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let i = t.topNode, o, s = Sh(null, t.preserveWhitespace, 0) | (r ? _i : 0);
    i ? o = new Yo(i.type, i.attrs, ee.none, !0, t.topMatch || i.type.contentMatch, s) : r ? o = new Yo(null, null, ee.none, !0, null, s) : o = new Yo(e.schema.topNodeType, null, ee.none, !0, null, s), this.nodes = [o], this.find = t.findPositions, this.needsBlock = !1;
  }
  get top() {
    return this.nodes[this.open];
  }
  // Add a DOM node to the content. Text is inserted as text node,
  // otherwise, the node is passed to `addElement` or, if it has a
  // `style` attribute, `addElementWithStyles`.
  addDOM(e, t) {
    e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
  }
  addTextNode(e, t) {
    let r = e.nodeValue, i = this.top, o = i.options & Qa ? "full" : this.localPreserveWS || (i.options & to) > 0, { schema: s } = this.parser;
    if (o === "full" || i.inlineContext(e) || /[^ \t\r\n\u000c]/.test(r)) {
      if (o)
        if (o === "full")
          r = r.replace(/\r\n?/g, `
`);
        else if (s.linebreakReplacement && /[\r\n]/.test(r) && this.top.findWrapping(s.linebreakReplacement.create())) {
          let l = r.split(/\r?\n|\r/);
          for (let a = 0; a < l.length; a++)
            a && this.insertNode(s.linebreakReplacement.create(), t, !0), l[a] && this.insertNode(s.text(l[a]), t, !/\S/.test(l[a]));
          r = "";
        } else
          r = r.replace(/\r?\n|\r/g, " ");
      else if (r = r.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(r) && this.open == this.nodes.length - 1) {
        let l = i.content[i.content.length - 1], a = e.previousSibling;
        (!l || a && a.nodeName == "BR" || l.isText && /[ \t\r\n\u000c]$/.test(l.text)) && (r = r.slice(1));
      }
      r && this.insertNode(s.text(r), t, !/\S/.test(r)), this.findInText(e);
    } else
      this.findInside(e);
  }
  // Try to find a handler for the given tag and use that to parse. If
  // none is found, the element's content nodes are added directly.
  addElement(e, t, r) {
    let i = this.localPreserveWS, o = this.top;
    (e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = !0);
    let s = e.nodeName.toLowerCase(), l;
    Tm.hasOwnProperty(s) && this.parser.normalizeLists && Kv(e);
    let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
    e: if (a ? a.ignore : Wv.hasOwnProperty(s))
      this.findInside(e), this.ignoreFallback(e, t);
    else if (!a || a.skip || a.closeParent) {
      a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
      let c, u = this.needsBlock;
      if (Mm.hasOwnProperty(s))
        o.content.length && o.content[0].isInline && this.open && (this.open--, o = this.top), c = !0, o.type || (this.needsBlock = !0);
      else if (!e.firstChild) {
        this.leafFallback(e, t);
        break e;
      }
      let d = a && a.skip ? t : this.readStyles(e, t);
      d && this.addAll(e, d), c && this.sync(o), this.needsBlock = u;
    } else {
      let c = this.readStyles(e, t);
      c && this.addElementByRule(e, a, c, a.consuming === !1 ? l : void 0);
    }
    this.localPreserveWS = i;
  }
  // Called for leaf DOM nodes that would otherwise be ignored
  leafFallback(e, t) {
    e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode(`
`), t);
  }
  // Called for ignored nodes
  ignoreFallback(e, t) {
    e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), t, !0);
  }
  // Run any style parser associated with the node's styles. Either
  // return an updated array of marks, or null to indicate some of the
  // styles had a rule with `ignore` set.
  readStyles(e, t) {
    let r = e.style;
    if (r && r.length)
      for (let i = 0; i < this.parser.matchedStyles.length; i++) {
        let o = this.parser.matchedStyles[i], s = r.getPropertyValue(o);
        if (s)
          for (let l = void 0; ; ) {
            let a = this.parser.matchStyle(o, s, this, l);
            if (!a)
              break;
            if (a.ignore)
              return null;
            if (a.clearMark ? t = t.filter((c) => !a.clearMark(c)) : t = t.concat(this.parser.schema.marks[a.mark].create(a.attrs)), a.consuming === !1)
              l = a;
            else
              break;
          }
      }
    return t;
  }
  // Look up a handler for the given node. If none are found, return
  // false. Otherwise, apply it, use its return value to drive the way
  // the node's content is wrapped, and return true.
  addElementByRule(e, t, r, i) {
    let o, s;
    if (t.node)
      if (s = this.parser.schema.nodes[t.node], s.isLeaf)
        this.insertNode(s.create(t.attrs), r, e.nodeName == "BR") || this.leafFallback(e, r);
      else {
        let a = this.enter(s, t.attrs || null, r, t.preserveWhitespace);
        a && (o = !0, r = a);
      }
    else {
      let a = this.parser.schema.marks[t.mark];
      r = r.concat(a.create(t.attrs));
    }
    let l = this.top;
    if (s && s.isLeaf)
      this.findInside(e);
    else if (i)
      this.addElement(e, r, i);
    else if (t.getContent)
      this.findInside(e), t.getContent(e, this.parser.schema).forEach((a) => this.insertNode(a, r, !1));
    else {
      let a = e;
      typeof t.contentElement == "string" ? a = e.querySelector(t.contentElement) : typeof t.contentElement == "function" ? a = t.contentElement(e) : t.contentElement && (a = t.contentElement), this.findAround(e, a, !0), this.addAll(a, r), this.findAround(e, a, !1);
    }
    o && this.sync(l) && this.open--;
  }
  // Add all child nodes between `startIndex` and `endIndex` (or the
  // whole node, if not given). If `sync` is passed, use it to
  // synchronize after every block element.
  addAll(e, t, r, i) {
    let o = r || 0;
    for (let s = r ? e.childNodes[r] : e.firstChild, l = i == null ? null : e.childNodes[i]; s != l; s = s.nextSibling, ++o)
      this.findAtPoint(e, o), this.addDOM(s, t);
    this.findAtPoint(e, o);
  }
  // Try to find a way to fit the given node type into the current
  // context. May add intermediate wrappers and/or leave non-solid
  // nodes that we're in.
  findPlace(e, t, r) {
    let i, o;
    for (let s = this.open, l = 0; s >= 0; s--) {
      let a = this.nodes[s], c = a.findWrapping(e);
      if (c && (!i || i.length > c.length + l) && (i = c, o = a, !c.length))
        break;
      if (a.solid) {
        if (r)
          break;
        l += 2;
      }
    }
    if (!i)
      return null;
    this.sync(o);
    for (let s = 0; s < i.length; s++)
      t = this.enterInner(i[s], null, t, !1);
    return t;
  }
  // Try to insert the given node, adjusting the context when needed.
  insertNode(e, t, r) {
    if (e.isInline && this.needsBlock && !this.top.type) {
      let o = this.textblockFromContext();
      o && (t = this.enterInner(o, null, t));
    }
    let i = this.findPlace(e, t, r);
    if (i) {
      this.closeExtra();
      let o = this.top;
      o.match && (o.match = o.match.matchType(e.type));
      let s = ee.none;
      for (let l of i.concat(e.marks))
        (o.type ? o.type.allowsMarkType(l.type) : Eh(l.type, e.type)) && (s = l.addToSet(s));
      return o.content.push(e.mark(s)), !0;
    }
    return !1;
  }
  // Try to start a node of the given type, adjusting the context when
  // necessary.
  enter(e, t, r, i) {
    let o = this.findPlace(e.create(t), r, !1);
    return o && (o = this.enterInner(e, t, r, !0, i)), o;
  }
  // Open a node of the given type
  enterInner(e, t, r, i = !1, o) {
    this.closeExtra();
    let s = this.top;
    s.match = s.match && s.match.matchType(e);
    let l = Sh(e, o, s.options);
    s.options & _i && s.content.length == 0 && (l |= _i);
    let a = ee.none;
    return r = r.filter((c) => (s.type ? s.type.allowsMarkType(c.type) : Eh(c.type, e)) ? (a = c.addToSet(a), !1) : !0), this.nodes.push(new Yo(e, t, a, i, null, l)), this.open++, r;
  }
  // Make sure all nodes above this.open are finished and added to
  // their parents
  closeExtra(e = !1) {
    let t = this.nodes.length - 1;
    if (t > this.open) {
      for (; t > this.open; t--)
        this.nodes[t - 1].content.push(this.nodes[t].finish(e));
      this.nodes.length = this.open + 1;
    }
  }
  finish() {
    return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
  }
  sync(e) {
    for (let t = this.open; t >= 0; t--) {
      if (this.nodes[t] == e)
        return this.open = t, !0;
      this.localPreserveWS && (this.nodes[t].options |= to);
    }
    return !1;
  }
  get currentPos() {
    this.closeExtra();
    let e = 0;
    for (let t = this.open; t >= 0; t--) {
      let r = this.nodes[t].content;
      for (let i = r.length - 1; i >= 0; i--)
        e += r[i].nodeSize;
      t && e++;
    }
    return e;
  }
  findAtPoint(e, t) {
    if (this.find)
      for (let r = 0; r < this.find.length; r++)
        this.find[r].node == e && this.find[r].offset == t && (this.find[r].pos = this.currentPos);
  }
  findInside(e) {
    if (this.find)
      for (let t = 0; t < this.find.length; t++)
        this.find[t].pos == null && e.nodeType == 1 && e.contains(this.find[t].node) && (this.find[t].pos = this.currentPos);
  }
  findAround(e, t, r) {
    if (e != t && this.find)
      for (let i = 0; i < this.find.length; i++)
        this.find[i].pos == null && e.nodeType == 1 && e.contains(this.find[i].node) && t.compareDocumentPosition(this.find[i].node) & (r ? 2 : 4) && (this.find[i].pos = this.currentPos);
  }
  findInText(e) {
    if (this.find)
      for (let t = 0; t < this.find.length; t++)
        this.find[t].node == e && (this.find[t].pos = this.currentPos - (e.nodeValue.length - this.find[t].offset));
  }
  // Determines whether the given context string matches this context.
  matchesContext(e) {
    if (e.indexOf("|") > -1)
      return e.split(/\s*\|\s*/).some(this.matchesContext, this);
    let t = e.split("/"), r = this.options.context, i = !this.isOpen && (!r || r.parent.type == this.nodes[0].type), o = -(r ? r.depth + 1 : 0) + (i ? 0 : 1), s = (l, a) => {
      for (; l >= 0; l--) {
        let c = t[l];
        if (c == "") {
          if (l == t.length - 1 || l == 0)
            continue;
          for (; a >= o; a--)
            if (s(l - 1, a))
              return !0;
          return !1;
        } else {
          let u = a > 0 || a == 0 && i ? this.nodes[a].type : r && a >= o ? r.node(a - o).type : null;
          if (!u || u.name != c && !u.isInGroup(c))
            return !1;
          a--;
        }
      }
      return !0;
    };
    return s(t.length - 1, this.open);
  }
  textblockFromContext() {
    let e = this.options.context;
    if (e)
      for (let t = e.depth; t >= 0; t--) {
        let r = e.node(t).contentMatchAt(e.indexAfter(t)).defaultType;
        if (r && r.isTextblock && r.defaultAttrs)
          return r;
      }
    for (let t in this.parser.schema.nodes) {
      let r = this.parser.schema.nodes[t];
      if (r.isTextblock && r.defaultAttrs)
        return r;
    }
  }
}
function Kv(n) {
  for (let e = n.firstChild, t = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && Tm.hasOwnProperty(r) && t ? (t.appendChild(e), e = t) : r == "li" ? t = e : r && (t = null);
  }
}
function Jv(n, e) {
  return (n.matches || n.msMatchesSelector || n.webkitMatchesSelector || n.mozMatchesSelector).call(n, e);
}
function vh(n) {
  let e = {};
  for (let t in n)
    e[t] = n[t];
  return e;
}
function Eh(n, e) {
  let t = e.schema.nodes;
  for (let r in t) {
    let i = t[r];
    if (!i.allowsMarkType(n))
      continue;
    let o = [], s = (l) => {
      o.push(l);
      for (let a = 0; a < l.edgeCount; a++) {
        let { type: c, next: u } = l.edge(a);
        if (c == e || o.indexOf(u) < 0 && s(u))
          return !0;
      }
    };
    if (s(i.contentMatch))
      return !0;
  }
}
class si {
  /**
  Create a serializer. `nodes` should map node names to functions
  that take a node and return a description of the corresponding
  DOM. `marks` does the same for mark names, but also gets an
  argument that tells it whether the mark's content is block or
  inline content (for typical use, it'll always be inline). A mark
  serializer may be `null` to indicate that marks of that type
  should not be serialized.
  */
  constructor(e, t) {
    this.nodes = e, this.marks = t;
  }
  /**
  Serialize the content of this fragment to a DOM fragment. When
  not in the browser, the `document` option, containing a DOM
  document, should be passed so that the serializer can create
  nodes.
  */
  serializeFragment(e, t = {}, r) {
    r || (r = Ql(t).createDocumentFragment());
    let i = r, o = [];
    return e.forEach((s) => {
      if (o.length || s.marks.length) {
        let l = 0, a = 0;
        for (; l < o.length && a < s.marks.length; ) {
          let c = s.marks[a];
          if (!this.marks[c.type.name]) {
            a++;
            continue;
          }
          if (!c.eq(o[l][0]) || c.type.spec.spanning === !1)
            break;
          l++, a++;
        }
        for (; l < o.length; )
          i = o.pop()[1];
        for (; a < s.marks.length; ) {
          let c = s.marks[a++], u = this.serializeMark(c, s.isInline, t);
          u && (o.push([c, i]), i.appendChild(u.dom), i = u.contentDOM || u.dom);
        }
      }
      i.appendChild(this.serializeNodeInner(s, t));
    }), r;
  }
  /**
  @internal
  */
  serializeNodeInner(e, t) {
    let { dom: r, contentDOM: i } = is(Ql(t), this.nodes[e.type.name](e), null, e.attrs);
    if (i) {
      if (e.isLeaf)
        throw new RangeError("Content hole not allowed in a leaf node spec");
      this.serializeFragment(e.content, t, i);
    }
    return r;
  }
  /**
  Serialize this node to a DOM node. This can be useful when you
  need to serialize a part of a document, as opposed to the whole
  document. To serialize a whole document, use
  [`serializeFragment`](https://prosemirror.net/docs/ref/#model.DOMSerializer.serializeFragment) on
  its [content](https://prosemirror.net/docs/ref/#model.Node.content).
  */
  serializeNode(e, t = {}) {
    let r = this.serializeNodeInner(e, t);
    for (let i = e.marks.length - 1; i >= 0; i--) {
      let o = this.serializeMark(e.marks[i], e.isInline, t);
      o && ((o.contentDOM || o.dom).appendChild(r), r = o.dom);
    }
    return r;
  }
  /**
  @internal
  */
  serializeMark(e, t, r = {}) {
    let i = this.marks[e.type.name];
    return i && is(Ql(r), i(e, t), null, e.attrs);
  }
  static renderSpec(e, t, r = null, i) {
    return is(e, t, r, i);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new si(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let t = Mh(e.nodes);
    return t.text || (t.text = (r) => r.text), t;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return Mh(e.marks);
  }
}
function Mh(n) {
  let e = {};
  for (let t in n) {
    let r = n[t].spec.toDOM;
    r && (e[t] = r);
  }
  return e;
}
function Ql(n) {
  return n.document || window.document;
}
const Th = /* @__PURE__ */ new WeakMap();
function Gv(n) {
  let e = Th.get(n);
  return e === void 0 && Th.set(n, e = Yv(n)), e;
}
function Yv(n) {
  let e = null;
  function t(r) {
    if (r && typeof r == "object")
      if (Array.isArray(r))
        if (typeof r[0] == "string")
          e || (e = []), e.push(r);
        else
          for (let i = 0; i < r.length; i++)
            t(r[i]);
      else
        for (let i in r)
          t(r[i]);
  }
  return t(n), e;
}
function is(n, e, t, r) {
  if (typeof e == "string")
    return { dom: n.createTextNode(e) };
  if (e.nodeType != null)
    return { dom: e };
  if (e.dom && e.dom.nodeType != null)
    return e;
  let i = e[0], o;
  if (typeof i != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (o = Gv(r)) && o.indexOf(e) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let s = i.indexOf(" ");
  s > 0 && (t = i.slice(0, s), i = i.slice(s + 1));
  let l, a = t ? n.createElementNS(t, i) : n.createElement(i), c = e[1], u = 1;
  if (c && typeof c == "object" && c.nodeType == null && !Array.isArray(c)) {
    u = 2;
    for (let d in c)
      if (c[d] != null) {
        let h = d.indexOf(" ");
        h > 0 ? a.setAttributeNS(d.slice(0, h), d.slice(h + 1), c[d]) : d == "style" && a.style ? a.style.cssText = c[d] : a.setAttribute(d, c[d]);
      }
  }
  for (let d = u; d < e.length; d++) {
    let h = e[d];
    if (h === 0) {
      if (d < e.length - 1 || d > u)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom: a, contentDOM: a };
    } else {
      let { dom: f, contentDOM: p } = is(n, h, t, r);
      if (a.appendChild(f), p) {
        if (l)
          throw new RangeError("Multiple content holes");
        l = p;
      }
    }
  }
  return { dom: a, contentDOM: l };
}
function Za(n) {
  const e = this;
  e.compiler = t;
  function t(r) {
    return JS(r, {
      ...e.data("settings"),
      ...n,
      // Note: this option is not in the readme.
      // The goal is for it to be set by plugins on `data` instead of being
      // passed by users.
      extensions: e.data("toMarkdownExtensions") || []
    });
  }
}
var Nm = (n) => {
  throw TypeError(n);
}, Im = (n, e, t) => e.has(n) || Nm("Cannot " + t), G = (n, e, t) => (Im(n, e, "read from private field"), t ? t.call(n) : e.get(n)), fe = (n, e, t) => e.has(n) ? Nm("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), ce = (n, e, t, r) => (Im(n, e, "write to private field"), e.set(n, t), t), Tt, Ei, ss, ls, as, Mi, Ti, qt, Ni, cs, us, Ii, ds, Ai, hs, fs, vr, Hn, ps, Oi;
class Am {
}
class Om {
  constructor() {
    this.elements = [], this.size = () => this.elements.length, this.top = () => this.elements.at(-1), this.push = (e) => {
      this.top()?.push(e);
    }, this.open = (e) => {
      this.elements.push(e);
    }, this.close = () => {
      const e = this.elements.pop();
      if (!e) throw am();
      return e;
    };
  }
}
class Jc extends Am {
  constructor(e, t, r) {
    super(), this.type = e, this.content = t, this.attrs = r;
  }
  push(e, ...t) {
    this.content.push(e, ...t);
  }
  pop() {
    return this.content.pop();
  }
  static create(e, t, r) {
    return new Jc(e, t, r);
  }
}
const ec = class extends Om {
  /// @internal
  constructor(e) {
    super(), fe(this, Tt), fe(this, Ei), fe(this, ss), fe(this, ls), fe(this, as), fe(this, Mi), fe(this, Ti), ce(this, Tt, ee.none), ce(this, Ei, (t) => t.isText), ce(this, ss, (t, r) => {
      if (G(this, Ei).call(this, t) && G(this, Ei).call(this, r) && ee.sameSet(t.marks, r.marks))
        return this.schema.text(t.text + r.text, t.marks);
    }), ce(this, ls, (t) => {
      const r = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((i) => i.spec.parseMarkdown.match(t));
      if (!r) throw yv(t);
      return r;
    }), ce(this, as, (t) => {
      const r = G(this, ls).call(this, t);
      r.spec.parseMarkdown.runner(this, t, r);
    }), this.injectRoot = (t, r, i) => (this.openNode(r, i), this.next(t.children), this), this.openNode = (t, r) => (this.open(Jc.create(t, [], r)), this), ce(this, Mi, () => {
      ce(this, Tt, ee.none);
      const t = this.close();
      return G(this, Ti).call(this, t.type, t.attrs, t.content);
    }), this.closeNode = () => {
      try {
        G(this, Mi).call(this);
      } catch (t) {
        console.error(t);
      }
      return this;
    }, ce(this, Ti, (t, r, i) => {
      const o = t.createAndFill(r, i, G(this, Tt));
      if (!o) throw gv(t, r, i);
      return this.push(o), o;
    }), this.addNode = (t, r, i) => {
      try {
        G(this, Ti).call(this, t, r, i);
      } catch (o) {
        console.error(o);
      }
      return this;
    }, this.openMark = (t, r) => {
      const i = t.create(r);
      return ce(this, Tt, i.addToSet(G(this, Tt))), this;
    }, this.closeMark = (t) => (ce(this, Tt, t.removeFromSet(G(this, Tt))), this), this.addText = (t) => {
      try {
        const r = this.top();
        if (!r) throw am();
        const i = r.pop(), o = this.schema.text(t, G(this, Tt));
        if (!i)
          return r.push(o), this;
        const s = G(this, ss).call(this, i, o);
        return s ? (r.push(s), this) : (r.push(i, o), this);
      } catch (r) {
        return console.error(r), this;
      }
    }, this.build = () => {
      let t;
      do
        t = G(this, Mi).call(this);
      while (this.size());
      return t;
    }, this.next = (t = []) => ([t].flat().forEach((r) => G(this, as).call(this, r)), this), this.toDoc = () => this.build(), this.run = (t, r) => {
      const i = t.runSync(
        t.parse(r),
        r
      );
      return this.next(i), this;
    }, this.schema = e;
  }
};
Tt = /* @__PURE__ */ new WeakMap();
Ei = /* @__PURE__ */ new WeakMap();
ss = /* @__PURE__ */ new WeakMap();
ls = /* @__PURE__ */ new WeakMap();
as = /* @__PURE__ */ new WeakMap();
Mi = /* @__PURE__ */ new WeakMap();
Ti = /* @__PURE__ */ new WeakMap();
ec.create = (n, e) => {
  const t = new ec(n);
  return (r) => (t.run(e, r), t.toDoc());
};
let Xv = ec;
const tc = class extends Am {
  constructor(e, t, r, i = {}) {
    super(), this.type = e, this.children = t, this.value = r, this.props = i, this.push = (o, ...s) => {
      this.children || (this.children = []), this.children.push(o, ...s);
    }, this.pop = () => this.children?.pop();
  }
};
tc.create = (n, e, t, r = {}) => new tc(n, e, t, r);
let Nh = tc;
const Qv = (n) => Object.prototype.hasOwnProperty.call(n, "size"), nc = class extends Om {
  /// @internal
  constructor(e) {
    super(), fe(this, qt), fe(this, Ni), fe(this, cs), fe(this, us), fe(this, Ii), fe(this, ds), fe(this, Ai), fe(this, hs), fe(this, fs), fe(this, vr), fe(this, Hn), fe(this, ps), fe(this, Oi), ce(this, qt, ee.none), ce(this, Ni, (t) => {
      const r = Object.values({
        ...this.schema.nodes,
        ...this.schema.marks
      }).find((i) => i.spec.toMarkdown.match(t));
      if (!r) throw bv(t.type);
      return r;
    }), ce(this, cs, (t) => G(this, Ni).call(this, t).spec.toMarkdown.runner(this, t)), ce(this, us, (t, r) => G(this, Ni).call(this, t).spec.toMarkdown.runner(this, t, r)), ce(this, Ii, (t) => {
      const { marks: r } = t, i = (l) => l.type.spec.priority ?? 50;
      [...r].sort((l, a) => i(l) - i(a)).every((l) => !G(this, us).call(this, l, t)) && G(this, cs).call(this, t), r.forEach((l) => G(this, Oi).call(this, l));
    }), ce(this, ds, (t, r) => {
      if (t.type === r || t.children?.length !== 1) return t;
      const i = (a) => {
        if (a.type === r) return a;
        if (a.children?.length !== 1) return null;
        const [c] = a.children;
        return c ? i(c) : null;
      }, o = i(t);
      if (!o) return t;
      const s = o.children ? [...o.children] : void 0, l = { ...t, children: s };
      return l.children = s, o.children = [l], o;
    }), ce(this, Ai, (t) => {
      const { children: r } = t;
      return r && (t.children = r.reduce((i, o, s) => {
        if (s === 0) return [o];
        const l = i.at(-1);
        if (l && l.isMark && o.isMark) {
          o = G(this, ds).call(this, o, l.type);
          const { children: a, ...c } = o, { children: u, ...d } = l;
          if (o.type === l.type && a && u && JSON.stringify(c) === JSON.stringify(d)) {
            const h = {
              ...d,
              children: [...u, ...a]
            };
            return i.slice(0, -1).concat(G(this, Ai).call(this, h));
          }
        }
        return i.concat(o);
      }, [])), t;
    }), ce(this, hs, (t) => {
      const r = {
        ...t.props,
        type: t.type
      };
      return t.children && (r.children = t.children), t.value && (r.value = t.value), r;
    }), this.openNode = (t, r, i) => (this.open(Nh.create(t, void 0, r, i)), this), ce(this, fs, (t, r) => {
      let i = "", o = "";
      const s = t.children;
      let l = -1, a = -1;
      const c = (d) => {
        d && d.forEach((h, f) => {
          h.type === "text" && h.value && (l < 0 && (l = f), a = f);
        });
      };
      if (s) {
        c(s);
        const d = s?.[a], h = s?.[l];
        if (d && d.value.endsWith(" ")) {
          const f = d.value, p = f.trimEnd();
          o = f.slice(p.length), d.value = p;
        }
        if (h && h.value.startsWith(" ")) {
          const f = h.value, p = f.trimStart();
          i = f.slice(0, f.length - p.length), h.value = p;
        }
      }
      i.length && G(this, Hn).call(this, "text", void 0, i);
      const u = r();
      return o.length && G(this, Hn).call(this, "text", void 0, o), u;
    }), ce(this, vr, (t = !1) => {
      const r = this.close(), i = () => G(this, Hn).call(this, r.type, r.children, r.value, r.props);
      return t ? G(this, fs).call(this, r, i) : i();
    }), this.closeNode = () => (G(this, vr).call(this), this), ce(this, Hn, (t, r, i, o) => {
      const s = Nh.create(t, r, i, o), l = G(this, Ai).call(this, G(this, hs).call(this, s));
      return this.push(l), l;
    }), this.addNode = (t, r, i, o) => (G(this, Hn).call(this, t, r, i, o), this), ce(this, ps, (t, r, i, o) => t.isInSet(G(this, qt)) ? this : (ce(this, qt, t.addToSet(G(this, qt))), this.openNode(r, i, { ...o, isMark: !0 }))), ce(this, Oi, (t) => {
      t.isInSet(G(this, qt)) && (ce(this, qt, t.type.removeFromSet(G(this, qt))), G(this, vr).call(this, !0));
    }), this.withMark = (t, r, i, o) => (G(this, ps).call(this, t, r, i, o), this), this.closeMark = (t) => (G(this, Oi).call(this, t), this), this.build = () => {
      let t = null;
      do
        t = G(this, vr).call(this);
      while (this.size());
      return t;
    }, this.next = (t) => Qv(t) ? (t.forEach((r) => {
      G(this, Ii).call(this, r);
    }), this) : (G(this, Ii).call(this, t), this), this.toString = (t) => t.stringify(this.build()), this.run = (t) => (this.next(t), this), this.schema = e;
  }
};
qt = /* @__PURE__ */ new WeakMap();
Ni = /* @__PURE__ */ new WeakMap();
cs = /* @__PURE__ */ new WeakMap();
us = /* @__PURE__ */ new WeakMap();
Ii = /* @__PURE__ */ new WeakMap();
ds = /* @__PURE__ */ new WeakMap();
Ai = /* @__PURE__ */ new WeakMap();
hs = /* @__PURE__ */ new WeakMap();
fs = /* @__PURE__ */ new WeakMap();
vr = /* @__PURE__ */ new WeakMap();
Hn = /* @__PURE__ */ new WeakMap();
ps = /* @__PURE__ */ new WeakMap();
Oi = /* @__PURE__ */ new WeakMap();
nc.create = (n, e) => {
  const t = new nc(n);
  return (r) => (t.run(r), t.toString(e));
};
let Zv = nc;
const Rm = 65535, Dm = Math.pow(2, 16);
function eE(n, e) {
  return n + e * Dm;
}
function Ih(n) {
  return n & Rm;
}
function tE(n) {
  return (n - (n & Rm)) / Dm;
}
const Lm = 1, Pm = 2, ms = 4, Bm = 8;
class rc {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.pos = e, this.delInfo = t, this.recover = r;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & Bm) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (Lm | ms)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (Pm | ms)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & ms) > 0;
  }
}
class Qe {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, t = !1) {
    if (this.ranges = e, this.inverted = t, !e.length && Qe.empty)
      return Qe.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let t = 0, r = Ih(e);
    if (!this.inverted)
      for (let i = 0; i < r; i++)
        t += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[r * 3] + t + tE(e);
  }
  mapResult(e, t = 1) {
    return this._map(e, t, !1);
  }
  map(e, t = 1) {
    return this._map(e, t, !0);
  }
  /**
  @internal
  */
  _map(e, t, r) {
    let i = 0, o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
    for (let l = 0; l < this.ranges.length; l += 3) {
      let a = this.ranges[l] - (this.inverted ? i : 0);
      if (a > e)
        break;
      let c = this.ranges[l + o], u = this.ranges[l + s], d = a + c;
      if (e <= d) {
        let h = c ? e == a ? -1 : e == d ? 1 : t : t, f = a + i + (h < 0 ? 0 : u);
        if (r)
          return f;
        let p = e == (t < 0 ? a : d) ? null : eE(l / 3, e - a), m = e == a ? Pm : e == d ? Lm : ms;
        return (t < 0 ? e != a : e != d) && (m |= Bm), new rc(f, m, p);
      }
      i += u - c;
    }
    return r ? e + i : new rc(e + i, 0, null);
  }
  /**
  @internal
  */
  touches(e, t) {
    let r = 0, i = Ih(t), o = this.inverted ? 2 : 1, s = this.inverted ? 1 : 2;
    for (let l = 0; l < this.ranges.length; l += 3) {
      let a = this.ranges[l] - (this.inverted ? r : 0);
      if (a > e)
        break;
      let c = this.ranges[l + o], u = a + c;
      if (e <= u && l == i * 3)
        return !0;
      r += this.ranges[l + s] - c;
    }
    return !1;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(e) {
    let t = this.inverted ? 2 : 1, r = this.inverted ? 1 : 2;
    for (let i = 0, o = 0; i < this.ranges.length; i += 3) {
      let s = this.ranges[i], l = s - (this.inverted ? o : 0), a = s + (this.inverted ? 0 : o), c = this.ranges[i + t], u = this.ranges[i + r];
      e(l, l + c, a, a + u), o += u - c;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new Qe(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(e) {
    return e == 0 ? Qe.empty : new Qe(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
Qe.empty = new Qe([]);
class no {
  /**
  Create a new mapping with the given position maps.
  */
  constructor(e, t, r = 0, i = e ? e.length : 0) {
    this.mirror = t, this.from = r, this.to = i, this._maps = e || [], this.ownData = !(e || t);
  }
  /**
  The step maps in this mapping.
  */
  get maps() {
    return this._maps;
  }
  /**
  Create a mapping that maps only through a part of this one.
  */
  slice(e = 0, t = this.maps.length) {
    return new no(this._maps, this.mirror, e, t);
  }
  /**
  Add a step map to the end of this mapping. If `mirrors` is
  given, it should be the index of the step map that is the mirror
  image of this one.
  */
  appendMap(e, t) {
    this.ownData || (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), this.ownData = !0), this.to = this._maps.push(e), t != null && this.setMirror(this._maps.length - 1, t);
  }
  /**
  Add all the step maps in a given mapping to this one (preserving
  mirroring information).
  */
  appendMapping(e) {
    for (let t = 0, r = this._maps.length; t < e._maps.length; t++) {
      let i = e.getMirror(t);
      this.appendMap(e._maps[t], i != null && i < t ? r + i : void 0);
    }
  }
  /**
  Finds the offset of the step map that mirrors the map at the
  given offset, in this mapping (as per the second argument to
  `appendMap`).
  */
  getMirror(e) {
    if (this.mirror) {
      for (let t = 0; t < this.mirror.length; t++)
        if (this.mirror[t] == e)
          return this.mirror[t + (t % 2 ? -1 : 1)];
    }
  }
  /**
  @internal
  */
  setMirror(e, t) {
    this.mirror || (this.mirror = []), this.mirror.push(e, t);
  }
  /**
  Append the inverse of the given mapping to this one.
  */
  appendMappingInverted(e) {
    for (let t = e.maps.length - 1, r = this._maps.length + e._maps.length; t >= 0; t--) {
      let i = e.getMirror(t);
      this.appendMap(e._maps[t].invert(), i != null && i > t ? r - i - 1 : void 0);
    }
  }
  /**
  Create an inverted version of this mapping.
  */
  invert() {
    let e = new no();
    return e.appendMappingInverted(this), e;
  }
  /**
  Map a position through this mapping.
  */
  map(e, t = 1) {
    if (this.mirror)
      return this._map(e, t, !0);
    for (let r = this.from; r < this.to; r++)
      e = this._maps[r].map(e, t);
    return e;
  }
  /**
  Map a position through this mapping, returning a mapping
  result.
  */
  mapResult(e, t = 1) {
    return this._map(e, t, !1);
  }
  /**
  @internal
  */
  _map(e, t, r) {
    let i = 0;
    for (let o = this.from; o < this.to; o++) {
      let s = this._maps[o], l = s.mapResult(e, t);
      if (l.recover != null) {
        let a = this.getMirror(o);
        if (a != null && a > o && a < this.to) {
          o = a, e = this._maps[a].recover(l.recover);
          continue;
        }
      }
      i |= l.delInfo, e = l.pos;
    }
    return r ? e : new rc(e, i, null);
  }
}
const Zl = /* @__PURE__ */ Object.create(null);
class Le {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return Qe.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(e) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(e, t) {
    if (!t || !t.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let r = Zl[t.stepType];
    if (!r)
      throw new RangeError(`No step type ${t.stepType} defined`);
    return r.fromJSON(e, t);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(e, t) {
    if (e in Zl)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return Zl[e] = t, t.prototype.jsonID = e, t;
  }
}
class pe {
  /**
  @internal
  */
  constructor(e, t) {
    this.doc = e, this.failed = t;
  }
  /**
  Create a successful step result.
  */
  static ok(e) {
    return new pe(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new pe(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, t, r, i) {
    try {
      return pe.ok(e.replace(t, r, i));
    } catch (o) {
      if (o instanceof Fs)
        return pe.fail(o.message);
      throw o;
    }
  }
}
function Gc(n, e, t) {
  let r = [];
  for (let i = 0; i < n.childCount; i++) {
    let o = n.child(i);
    o.content.size && (o = o.copy(Gc(o.content, e, o))), o.isInline && (o = e(o, t, i)), r.push(o);
  }
  return N.fromArray(r);
}
class Zt extends Le {
  /**
  Create a mark step.
  */
  constructor(e, t, r) {
    super(), this.from = e, this.to = t, this.mark = r;
  }
  apply(e) {
    let t = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), o = new R(Gc(t.content, (s, l) => !s.isAtom || !l.type.allowsMarkType(this.mark.type) ? s : s.mark(this.mark.addToSet(s.marks)), i), t.openStart, t.openEnd);
    return pe.fromReplace(e, this.from, this.to, o);
  }
  invert() {
    return new Ot(this.from, this.to, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return t.deleted && r.deleted || t.pos >= r.pos ? null : new Zt(t.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Zt && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Zt(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new Zt(t.from, t.to, e.markFromJSON(t.mark));
  }
}
Le.jsonID("addMark", Zt);
class Ot extends Le {
  /**
  Create a mark-removing step.
  */
  constructor(e, t, r) {
    super(), this.from = e, this.to = t, this.mark = r;
  }
  apply(e) {
    let t = e.slice(this.from, this.to), r = new R(Gc(t.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), t.openStart, t.openEnd);
    return pe.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new Zt(this.from, this.to, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return t.deleted && r.deleted || t.pos >= r.pos ? null : new Ot(t.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof Ot && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new Ot(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new Ot(t.from, t.to, e.markFromJSON(t.mark));
  }
}
Le.jsonID("removeMark", Ot);
class wn extends Le {
  /**
  Create a node mark step.
  */
  constructor(e, t) {
    super(), this.pos = e, this.mark = t;
  }
  apply(e) {
    let t = e.nodeAt(this.pos);
    if (!t)
      return pe.fail("No node at mark step's position");
    let r = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
    return pe.fromReplace(e, this.pos, this.pos + 1, new R(N.from(r), 0, t.isLeaf ? 0 : 1));
  }
  invert(e) {
    let t = e.nodeAt(this.pos);
    if (t) {
      let r = this.mark.addToSet(t.marks);
      if (r.length == t.marks.length) {
        for (let i = 0; i < t.marks.length; i++)
          if (!t.marks[i].isInSet(r))
            return new wn(this.pos, t.marks[i]);
        return new wn(this.pos, this.mark);
      }
    }
    return new ar(this.pos, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.pos, 1);
    return t.deletedAfter ? null : new wn(t.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new wn(t.pos, e.markFromJSON(t.mark));
  }
}
Le.jsonID("addNodeMark", wn);
class ar extends Le {
  /**
  Create a mark-removing step.
  */
  constructor(e, t) {
    super(), this.pos = e, this.mark = t;
  }
  apply(e) {
    let t = e.nodeAt(this.pos);
    if (!t)
      return pe.fail("No node at mark step's position");
    let r = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
    return pe.fromReplace(e, this.pos, this.pos + 1, new R(N.from(r), 0, t.isLeaf ? 0 : 1));
  }
  invert(e) {
    let t = e.nodeAt(this.pos);
    return !t || !this.mark.isInSet(t.marks) ? this : new wn(this.pos, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.pos, 1);
    return t.deletedAfter ? null : new ar(t.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new ar(t.pos, e.markFromJSON(t.mark));
  }
}
Le.jsonID("removeNodeMark", ar);
class we extends Le {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(e, t, r, i = !1) {
    super(), this.from = e, this.to = t, this.slice = r, this.structure = i;
  }
  apply(e) {
    return this.structure && ic(e, this.from, this.to) ? pe.fail("Structure replace would overwrite content") : pe.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new Qe([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new we(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return t.deletedAcross && r.deletedAcross ? null : new we(t.pos, Math.max(t.pos, r.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof we) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let t = this.slice.size + e.slice.size == 0 ? R.empty : new R(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new we(this.from, this.to + (e.to - e.from), t, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let t = this.slice.size + e.slice.size == 0 ? R.empty : new R(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new we(e.from, this.to, t, this.structure);
    } else
      return null;
  }
  toJSON() {
    let e = { stepType: "replace", from: this.from, to: this.to };
    return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new we(t.from, t.to, R.fromJSON(e, t.slice), !!t.structure);
  }
}
Le.jsonID("replace", we);
class De extends Le {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(e, t, r, i, o, s, l = !1) {
    super(), this.from = e, this.to = t, this.gapFrom = r, this.gapTo = i, this.slice = o, this.insert = s, this.structure = l;
  }
  apply(e) {
    if (this.structure && (ic(e, this.from, this.gapFrom) || ic(e, this.gapTo, this.to)))
      return pe.fail("Structure gap-replace would overwrite content");
    let t = e.slice(this.gapFrom, this.gapTo);
    if (t.openStart || t.openEnd)
      return pe.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, t.content);
    return r ? pe.fromReplace(e, this.from, this.to, r) : pe.fail("Content does not fit in gap");
  }
  getMap() {
    return new Qe([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(e) {
    let t = this.gapTo - this.gapFrom;
    return new De(this.from, this.from + this.slice.size + t, this.from + this.insert, this.from + this.insert + t, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? t.pos : e.map(this.gapFrom, -1), o = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return t.deletedAcross && r.deletedAcross || i < t.pos || o > r.pos ? null : new De(t.pos, r.pos, i, o, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let e = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number" || typeof t.gapFrom != "number" || typeof t.gapTo != "number" || typeof t.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new De(t.from, t.to, t.gapFrom, t.gapTo, R.fromJSON(e, t.slice), t.insert, !!t.structure);
  }
}
Le.jsonID("replaceAround", De);
function ic(n, e, t) {
  let r = n.resolve(e), i = t - e, o = r.depth;
  for (; i > 0 && o > 0 && r.indexAfter(o) == r.node(o).childCount; )
    o--, i--;
  if (i > 0) {
    let s = r.node(o).maybeChild(r.indexAfter(o));
    for (; i > 0; ) {
      if (!s || s.isLeaf)
        return !0;
      s = s.firstChild, i--;
    }
  }
  return !1;
}
function nE(n, e, t, r) {
  let i = [], o = [], s, l;
  n.doc.nodesBetween(e, t, (a, c, u) => {
    if (!a.isInline)
      return;
    let d = a.marks;
    if (!r.isInSet(d) && u.type.allowsMarkType(r.type)) {
      let h = Math.max(c, e), f = Math.min(c + a.nodeSize, t), p = r.addToSet(d);
      for (let m = 0; m < d.length; m++)
        d[m].isInSet(p) || (s && s.to == h && s.mark.eq(d[m]) ? s.to = f : i.push(s = new Ot(h, f, d[m])));
      l && l.to == h ? l.to = f : o.push(l = new Zt(h, f, r));
    }
  }), i.forEach((a) => n.step(a)), o.forEach((a) => n.step(a));
}
function rE(n, e, t, r) {
  let i = [], o = 0;
  n.doc.nodesBetween(e, t, (s, l) => {
    if (!s.isInline)
      return;
    o++;
    let a = null;
    if (r instanceof cl) {
      let c = s.marks, u;
      for (; u = r.isInSet(c); )
        (a || (a = [])).push(u), c = u.removeFromSet(c);
    } else r ? r.isInSet(s.marks) && (a = [r]) : a = s.marks;
    if (a && a.length) {
      let c = Math.min(l + s.nodeSize, t);
      for (let u = 0; u < a.length; u++) {
        let d = a[u], h;
        for (let f = 0; f < i.length; f++) {
          let p = i[f];
          p.step == o - 1 && d.eq(i[f].style) && (h = p);
        }
        h ? (h.to = c, h.step = o) : i.push({ style: d, from: Math.max(l, e), to: c, step: o });
      }
    }
  }), i.forEach((s) => n.step(new Ot(s.from, s.to, s.style)));
}
function Yc(n, e, t, r = t.contentMatch, i = !0) {
  let o = n.doc.nodeAt(e), s = [], l = e + 1;
  for (let a = 0; a < o.childCount; a++) {
    let c = o.child(a), u = l + c.nodeSize, d = r.matchType(c.type);
    if (!d)
      s.push(new we(l, u, R.empty));
    else {
      r = d;
      for (let h = 0; h < c.marks.length; h++)
        t.allowsMarkType(c.marks[h].type) || n.step(new Ot(l, u, c.marks[h]));
      if (i && c.isText && t.whitespace != "pre") {
        let h, f = /\r?\n|\r/g, p;
        for (; h = f.exec(c.text); )
          p || (p = new R(N.from(t.schema.text(" ", t.allowedMarks(c.marks))), 0, 0)), s.push(new we(l + h.index, l + h.index + h[0].length, p));
      }
    }
    l = u;
  }
  if (!r.validEnd) {
    let a = r.fillBefore(N.empty, !0);
    n.replace(l, l, new R(a, 0, 0));
  }
  for (let a = s.length - 1; a >= 0; a--)
    n.step(s[a]);
}
function iE(n, e, t) {
  return (e == 0 || n.canReplace(e, n.childCount)) && (t == n.childCount || n.canReplace(0, t));
}
function ul(n) {
  let t = n.parent.content.cutByIndex(n.startIndex, n.endIndex);
  for (let r = n.depth; ; --r) {
    let i = n.$from.node(r), o = n.$from.index(r), s = n.$to.indexAfter(r);
    if (r < n.depth && i.canReplace(o, s, t))
      return r;
    if (r == 0 || i.type.spec.isolating || !iE(i, o, s))
      break;
  }
  return null;
}
function oE(n, e, t) {
  let { $from: r, $to: i, depth: o } = e, s = r.before(o + 1), l = i.after(o + 1), a = s, c = l, u = N.empty, d = 0;
  for (let p = o, m = !1; p > t; p--)
    m || r.index(p) > 0 ? (m = !0, u = N.from(r.node(p).copy(u)), d++) : a--;
  let h = N.empty, f = 0;
  for (let p = o, m = !1; p > t; p--)
    m || i.after(p + 1) < i.end(p) ? (m = !0, h = N.from(i.node(p).copy(h)), f++) : c++;
  n.step(new De(a, c, s, l, new R(u.append(h), d, f), u.size - d, !0));
}
function Xc(n, e, t = null, r = n) {
  let i = sE(n, e), o = i && lE(r, e);
  return o ? i.map(Ah).concat({ type: e, attrs: t }).concat(o.map(Ah)) : null;
}
function Ah(n) {
  return { type: n, attrs: null };
}
function sE(n, e) {
  let { parent: t, startIndex: r, endIndex: i } = n, o = t.contentMatchAt(r).findWrapping(e);
  if (!o)
    return null;
  let s = o.length ? o[0] : e;
  return t.canReplaceWith(r, i, s) ? o : null;
}
function lE(n, e) {
  let { parent: t, startIndex: r, endIndex: i } = n, o = t.child(r), s = e.contentMatch.findWrapping(o.type);
  if (!s)
    return null;
  let a = (s.length ? s[s.length - 1] : e).contentMatch;
  for (let c = r; a && c < i; c++)
    a = a.matchType(t.child(c).type);
  return !a || !a.validEnd ? null : s;
}
function aE(n, e, t) {
  let r = N.empty;
  for (let s = t.length - 1; s >= 0; s--) {
    if (r.size) {
      let l = t[s].type.contentMatch.matchFragment(r);
      if (!l || !l.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    r = N.from(t[s].type.create(t[s].attrs, r));
  }
  let i = e.start, o = e.end;
  n.step(new De(i, o, i, o, new R(r, 0, 0), t.length, !0));
}
function cE(n, e, t, r, i) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let o = n.steps.length;
  n.doc.nodesBetween(e, t, (s, l) => {
    let a = typeof i == "function" ? i(s) : i;
    if (s.isTextblock && !s.hasMarkup(r, a) && uE(n.doc, n.mapping.slice(o).map(l), r)) {
      let c = null;
      if (r.schema.linebreakReplacement) {
        let f = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        f && !p ? c = !1 : !f && p && (c = !0);
      }
      c === !1 && zm(n, s, l, o), Yc(n, n.mapping.slice(o).map(l, 1), r, void 0, c === null);
      let u = n.mapping.slice(o), d = u.map(l, 1), h = u.map(l + s.nodeSize, 1);
      return n.step(new De(d, h, d + 1, h - 1, new R(N.from(r.create(a, null, s.marks)), 0, 0), 1, !0)), c === !0 && $m(n, s, l, o), !1;
    }
  });
}
function $m(n, e, t, r) {
  e.forEach((i, o) => {
    if (i.isText) {
      let s, l = /\r?\n|\r/g;
      for (; s = l.exec(i.text); ) {
        let a = n.mapping.slice(r).map(t + 1 + o + s.index);
        n.replaceWith(a, a + 1, e.type.schema.linebreakReplacement.create());
      }
    }
  });
}
function zm(n, e, t, r) {
  e.forEach((i, o) => {
    if (i.type == i.type.schema.linebreakReplacement) {
      let s = n.mapping.slice(r).map(t + 1 + o);
      n.replaceWith(s, s + 1, e.type.schema.text(`
`));
    }
  });
}
function uE(n, e, t) {
  let r = n.resolve(e), i = r.index();
  return r.parent.canReplaceWith(i, i + 1, t);
}
function dE(n, e, t, r, i) {
  let o = n.doc.nodeAt(e);
  if (!o)
    throw new RangeError("No node at given position");
  t || (t = o.type);
  let s = t.create(r, null, i || o.marks);
  if (o.isLeaf)
    return n.replaceWith(e, e + o.nodeSize, s);
  if (!t.validContent(o.content))
    throw new RangeError("Invalid content for node type " + t.name);
  n.step(new De(e, e + o.nodeSize, e + 1, e + o.nodeSize - 1, new R(N.from(s), 0, 0), 1, !0));
}
function Hi(n, e, t = 1, r) {
  let i = n.resolve(e), o = i.depth - t, s = r && r[r.length - 1] || i.parent;
  if (o < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !s.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount)))
    return !1;
  for (let c = i.depth - 1, u = t - 2; c > o; c--, u--) {
    let d = i.node(c), h = i.index(c);
    if (d.type.spec.isolating)
      return !1;
    let f = d.content.cutByIndex(h, d.childCount), p = r && r[u + 1];
    p && (f = f.replaceChild(0, p.type.create(p.attrs)));
    let m = r && r[u] || d;
    if (!d.canReplace(h + 1, d.childCount) || !m.type.validContent(f))
      return !1;
  }
  let l = i.indexAfter(o), a = r && r[0];
  return i.node(o).canReplaceWith(l, l, a ? a.type : i.node(o + 1).type);
}
function hE(n, e, t = 1, r) {
  let i = n.doc.resolve(e), o = N.empty, s = N.empty;
  for (let l = i.depth, a = i.depth - t, c = t - 1; l > a; l--, c--) {
    o = N.from(i.node(l).copy(o));
    let u = r && r[c];
    s = N.from(u ? u.type.create(u.attrs, s) : i.node(l).copy(s));
  }
  n.step(new we(e, e, new R(o.append(s), t, t), !0));
}
function dl(n, e) {
  let t = n.resolve(e), r = t.index();
  return pE(t.nodeBefore, t.nodeAfter) && t.parent.canReplace(r, r + 1);
}
function fE(n, e) {
  e.content.size || n.type.compatibleContent(e.type);
  let t = n.contentMatchAt(n.childCount), { linebreakReplacement: r } = n.type.schema;
  for (let i = 0; i < e.childCount; i++) {
    let o = e.child(i), s = o.type == r ? n.type.schema.nodes.text : o.type;
    if (t = t.matchType(s), !t || !n.type.allowsMarks(o.marks))
      return !1;
  }
  return t.validEnd;
}
function pE(n, e) {
  return !!(n && e && !n.isLeaf && fE(n, e));
}
function mE(n, e, t) {
  let r = null, { linebreakReplacement: i } = n.doc.type.schema, o = n.doc.resolve(e - t), s = o.node().type;
  if (i && s.inlineContent) {
    let u = s.whitespace == "pre", d = !!s.contentMatch.matchType(i);
    u && !d ? r = !1 : !u && d && (r = !0);
  }
  let l = n.steps.length;
  if (r === !1) {
    let u = n.doc.resolve(e + t);
    zm(n, u.node(), u.before(), l);
  }
  s.inlineContent && Yc(n, e + t - 1, s, o.node().contentMatchAt(o.index()), r == null);
  let a = n.mapping.slice(l), c = a.map(e - t);
  if (n.step(new we(c, a.map(e + t, -1), R.empty, !0)), r === !0) {
    let u = n.doc.resolve(c);
    $m(n, u.node(), u.before(), n.steps.length);
  }
  return n;
}
function gE(n, e, t) {
  let r = n.resolve(e);
  if (r.parent.canReplaceWith(r.index(), r.index(), t))
    return e;
  if (r.parentOffset == 0)
    for (let i = r.depth - 1; i >= 0; i--) {
      let o = r.index(i);
      if (r.node(i).canReplaceWith(o, o, t))
        return r.before(i + 1);
      if (o > 0)
        return null;
    }
  if (r.parentOffset == r.parent.content.size)
    for (let i = r.depth - 1; i >= 0; i--) {
      let o = r.indexAfter(i);
      if (r.node(i).canReplaceWith(o, o, t))
        return r.after(i + 1);
      if (o < r.node(i).childCount)
        return null;
    }
  return null;
}
function yE(n, e, t) {
  let r = n.resolve(e);
  if (!t.content.size)
    return e;
  let i = t.content;
  for (let o = 0; o < t.openStart; o++)
    i = i.firstChild.content;
  for (let o = 1; o <= (t.openStart == 0 && t.size ? 2 : 1); o++)
    for (let s = r.depth; s >= 0; s--) {
      let l = s == r.depth ? 0 : r.pos <= (r.start(s + 1) + r.end(s + 1)) / 2 ? -1 : 1, a = r.index(s) + (l > 0 ? 1 : 0), c = r.node(s), u = !1;
      if (o == 1)
        u = c.canReplace(a, a, i);
      else {
        let d = c.contentMatchAt(a).findWrapping(i.firstChild.type);
        u = d && c.canReplaceWith(a, a, d[0]);
      }
      if (u)
        return l == 0 ? r.pos : l < 0 ? r.before(s + 1) : r.after(s + 1);
    }
  return null;
}
function hl(n, e, t = e, r = R.empty) {
  if (e == t && !r.size)
    return null;
  let i = n.resolve(e), o = n.resolve(t);
  return Fm(i, o, r) ? new we(e, t, r) : new bE(i, o, r).fit();
}
function Fm(n, e, t) {
  return !t.openStart && !t.openEnd && n.start() == e.start() && n.parent.canReplace(n.index(), e.index(), t.content);
}
class bE {
  constructor(e, t, r) {
    this.$from = e, this.$to = t, this.unplaced = r, this.frontier = [], this.placed = N.empty;
    for (let i = 0; i <= e.depth; i++) {
      let o = e.node(i);
      this.frontier.push({
        type: o.type,
        match: o.contentMatchAt(e.indexAfter(i))
      });
    }
    for (let i = e.depth; i > 0; i--)
      this.placed = N.from(e.node(i).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    for (; this.unplaced.size; ) {
      let c = this.findFittable();
      c ? this.placeNodes(c) : this.openMore() || this.dropNode();
    }
    let e = this.mustMoveInline(), t = this.placed.size - this.depth - this.$from.depth, r = this.$from, i = this.close(e < 0 ? this.$to : r.doc.resolve(e));
    if (!i)
      return null;
    let o = this.placed, s = r.depth, l = i.depth;
    for (; s && l && o.childCount == 1; )
      o = o.firstChild.content, s--, l--;
    let a = new R(o, s, l);
    return e > -1 ? new De(r.pos, e, this.$to.pos, this.$to.end(), a, t) : a.size || r.pos != this.$to.pos ? new we(r.pos, i.pos, a) : null;
  }
  // Find a position on the start spine of `this.unplaced` that has
  // content that can be moved somewhere on the frontier. Returns two
  // depths, one for the slice and one for the frontier.
  findFittable() {
    let e = this.unplaced.openStart;
    for (let t = this.unplaced.content, r = 0, i = this.unplaced.openEnd; r < e; r++) {
      let o = t.firstChild;
      if (t.childCount > 1 && (i = 0), o.type.spec.isolating && i <= r) {
        e = r;
        break;
      }
      t = o.content;
    }
    for (let t = 1; t <= 2; t++)
      for (let r = t == 1 ? e : this.unplaced.openStart; r >= 0; r--) {
        let i, o = null;
        r ? (o = ea(this.unplaced.content, r - 1).firstChild, i = o.content) : i = this.unplaced.content;
        let s = i.firstChild;
        for (let l = this.depth; l >= 0; l--) {
          let { type: a, match: c } = this.frontier[l], u, d = null;
          if (t == 1 && (s ? c.matchType(s.type) || (d = c.fillBefore(N.from(s), !1)) : o && a.compatibleContent(o.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, inject: d };
          if (t == 2 && s && (u = c.findWrapping(s.type)))
            return { sliceDepth: r, frontierDepth: l, parent: o, wrap: u };
          if (o && c.matchType(o.type))
            break;
        }
      }
  }
  openMore() {
    let { content: e, openStart: t, openEnd: r } = this.unplaced, i = ea(e, t);
    return !i.childCount || i.firstChild.isLeaf ? !1 : (this.unplaced = new R(e, t + 1, Math.max(r, i.size + t >= e.size - r ? t + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: t, openEnd: r } = this.unplaced, i = ea(e, t);
    if (i.childCount <= 1 && t > 0) {
      let o = e.size - t <= t + i.size;
      this.unplaced = new R(Ri(e, t - 1, 1), t - 1, o ? t - 1 : r);
    } else
      this.unplaced = new R(Ri(e, t, 1), t, r);
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth: e, frontierDepth: t, parent: r, inject: i, wrap: o }) {
    for (; this.depth > t; )
      this.closeFrontierNode();
    if (o)
      for (let m = 0; m < o.length; m++)
        this.openFrontierNode(o[m]);
    let s = this.unplaced, l = r ? r.content : s.content, a = s.openStart - e, c = 0, u = [], { match: d, type: h } = this.frontier[t];
    if (i) {
      for (let m = 0; m < i.childCount; m++)
        u.push(i.child(m));
      d = d.matchFragment(i);
    }
    let f = l.size + e - (s.content.size - s.openEnd);
    for (; c < l.childCount; ) {
      let m = l.child(c), y = d.matchType(m.type);
      if (!y)
        break;
      c++, (c > 1 || a == 0 || m.content.size) && (d = y, u.push(_m(m.mark(h.allowedMarks(m.marks)), c == 1 ? a : 0, c == l.childCount ? f : -1)));
    }
    let p = c == l.childCount;
    p || (f = -1), this.placed = Di(this.placed, t, N.from(u)), this.frontier[t].match = d, p && f < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let m = 0, y = l; m < f; m++) {
      let g = y.lastChild;
      this.frontier.push({ type: g.type, match: g.contentMatchAt(g.childCount) }), y = g.content;
    }
    this.unplaced = p ? e == 0 ? R.empty : new R(Ri(s.content, e - 1, 1), e - 1, f < 0 ? s.openEnd : e - 1) : new R(Ri(s.content, e, c), s.openStart, s.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], t;
    if (!e.type.isTextblock || !ta(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, i = this.$to.after(r);
    for (; r > 1 && i == this.$to.end(--r); )
      ++i;
    return i;
  }
  findCloseLevel(e) {
    e: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
      let { match: r, type: i } = this.frontier[t], o = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), s = ta(e, t, i, r, o);
      if (s) {
        for (let l = t - 1; l >= 0; l--) {
          let { match: a, type: c } = this.frontier[l], u = ta(e, l, c, a, !0);
          if (!u || u.childCount)
            continue e;
        }
        return { depth: t, fit: s, move: o ? e.doc.resolve(e.after(t + 1)) : e };
      }
    }
  }
  close(e) {
    let t = this.findCloseLevel(e);
    if (!t)
      return null;
    for (; this.depth > t.depth; )
      this.closeFrontierNode();
    t.fit.childCount && (this.placed = Di(this.placed, t.depth, t.fit)), e = t.move;
    for (let r = t.depth + 1; r <= e.depth; r++) {
      let i = e.node(r), o = i.type.contentMatch.fillBefore(i.content, !0, e.index(r));
      this.openFrontierNode(i.type, i.attrs, o);
    }
    return e;
  }
  openFrontierNode(e, t = null, r) {
    let i = this.frontier[this.depth];
    i.match = i.match.matchType(e), this.placed = Di(this.placed, this.depth, N.from(e.create(t, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let t = this.frontier.pop().match.fillBefore(N.empty, !0);
    t.childCount && (this.placed = Di(this.placed, this.frontier.length, t));
  }
}
function Ri(n, e, t) {
  return e == 0 ? n.cutByIndex(t, n.childCount) : n.replaceChild(0, n.firstChild.copy(Ri(n.firstChild.content, e - 1, t)));
}
function Di(n, e, t) {
  return e == 0 ? n.append(t) : n.replaceChild(n.childCount - 1, n.lastChild.copy(Di(n.lastChild.content, e - 1, t)));
}
function ea(n, e) {
  for (let t = 0; t < e; t++)
    n = n.firstChild.content;
  return n;
}
function _m(n, e, t) {
  if (e <= 0)
    return n;
  let r = n.content;
  return e > 1 && (r = r.replaceChild(0, _m(r.firstChild, e - 1, r.childCount == 1 ? t - 1 : 0))), e > 0 && (r = n.type.contentMatch.fillBefore(r).append(r), t <= 0 && (r = r.append(n.type.contentMatch.matchFragment(r).fillBefore(N.empty, !0)))), n.copy(r);
}
function ta(n, e, t, r, i) {
  let o = n.node(e), s = i ? n.indexAfter(e) : n.index(e);
  if (s == o.childCount && !t.compatibleContent(o.type))
    return null;
  let l = r.fillBefore(o.content, !0, s);
  return l && !kE(t, o.content, s) ? l : null;
}
function kE(n, e, t) {
  for (let r = t; r < e.childCount; r++)
    if (!n.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function wE(n) {
  return n.spec.defining || n.spec.definingForContent;
}
function CE(n, e, t, r) {
  if (!r.size)
    return n.deleteRange(e, t);
  let i = n.doc.resolve(e), o = n.doc.resolve(t);
  if (Fm(i, o, r))
    return n.step(new we(e, t, r));
  let s = qm(i, n.doc.resolve(t));
  s[s.length - 1] == 0 && s.pop();
  let l = -(i.depth + 1);
  s.unshift(l);
  for (let h = i.depth, f = i.pos - 1; h > 0; h--, f--) {
    let p = i.node(h).type.spec;
    if (p.defining || p.definingAsContext || p.isolating)
      break;
    s.indexOf(h) > -1 ? l = h : i.before(h) == f && s.splice(1, 0, -h);
  }
  let a = s.indexOf(l), c = [], u = r.openStart;
  for (let h = r.content, f = 0; ; f++) {
    let p = h.firstChild;
    if (c.push(p), f == r.openStart)
      break;
    h = p.content;
  }
  for (let h = u - 1; h >= 0; h--) {
    let f = c[h], p = wE(f.type);
    if (p && !f.sameMarkup(i.node(Math.abs(l) - 1)))
      u = h;
    else if (p || !f.type.isTextblock)
      break;
  }
  for (let h = r.openStart; h >= 0; h--) {
    let f = (h + u + 1) % (r.openStart + 1), p = c[f];
    if (p)
      for (let m = 0; m < s.length; m++) {
        let y = s[(m + a) % s.length], g = !0;
        y < 0 && (g = !1, y = -y);
        let C = i.node(y - 1), x = i.index(y - 1);
        if (C.canReplaceWith(x, x, p.type, p.marks))
          return n.replace(i.before(y), g ? o.after(y) : t, new R(Hm(r.content, 0, r.openStart, f), f, r.openEnd));
      }
  }
  let d = n.steps.length;
  for (let h = s.length - 1; h >= 0 && (n.replace(e, t, r), !(n.steps.length > d)); h--) {
    let f = s[h];
    f < 0 || (e = i.before(f), t = o.after(f));
  }
}
function Hm(n, e, t, r, i) {
  if (e < t) {
    let o = n.firstChild;
    n = n.replaceChild(0, o.copy(Hm(o.content, e + 1, t, r, o)));
  }
  if (e > r) {
    let o = i.contentMatchAt(0), s = o.fillBefore(n).append(n);
    n = s.append(o.matchFragment(s).fillBefore(N.empty, !0));
  }
  return n;
}
function SE(n, e, t, r) {
  if (!r.isInline && e == t && n.doc.resolve(e).parent.content.size) {
    let i = gE(n.doc, e, r.type);
    i != null && (e = t = i);
  }
  n.replaceRange(e, t, new R(N.from(r), 0, 0));
}
function xE(n, e, t) {
  let r = n.doc.resolve(e), i = n.doc.resolve(t), o = qm(r, i);
  for (let s = 0; s < o.length; s++) {
    let l = o[s], a = s == o.length - 1;
    if (a && l == 0 || r.node(l).type.contentMatch.validEnd)
      return n.delete(r.start(l), i.end(l));
    if (l > 0 && (a || r.node(l - 1).canReplace(r.index(l - 1), i.indexAfter(l - 1))))
      return n.delete(r.before(l), i.after(l));
  }
  for (let s = 1; s <= r.depth && s <= i.depth; s++)
    if (e - r.start(s) == r.depth - s && t > r.end(s) && i.end(s) - t != i.depth - s && r.start(s - 1) == i.start(s - 1) && r.node(s - 1).canReplace(r.index(s - 1), i.index(s - 1)))
      return n.delete(r.before(s), t);
  n.delete(e, t);
}
function qm(n, e) {
  let t = [], r = Math.min(n.depth, e.depth);
  for (let i = r; i >= 0; i--) {
    let o = n.start(i);
    if (o < n.pos - (n.depth - i) || e.end(i) > e.pos + (e.depth - i) || n.node(i).type.spec.isolating || e.node(i).type.spec.isolating)
      break;
    (o == e.start(i) || i == n.depth && i == e.depth && n.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == o - 1) && t.push(i);
  }
  return t;
}
class Pr extends Le {
  /**
  Construct an attribute step.
  */
  constructor(e, t, r) {
    super(), this.pos = e, this.attr = t, this.value = r;
  }
  apply(e) {
    let t = e.nodeAt(this.pos);
    if (!t)
      return pe.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let o in t.attrs)
      r[o] = t.attrs[o];
    r[this.attr] = this.value;
    let i = t.type.create(r, null, t.marks);
    return pe.fromReplace(e, this.pos, this.pos + 1, new R(N.from(i), 0, t.isLeaf ? 0 : 1));
  }
  getMap() {
    return Qe.empty;
  }
  invert(e) {
    return new Pr(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let t = e.mapResult(this.pos, 1);
    return t.deletedAfter ? null : new Pr(t.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, t) {
    if (typeof t.pos != "number" || typeof t.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new Pr(t.pos, t.attr, t.value);
  }
}
Le.jsonID("attr", Pr);
class ro extends Le {
  /**
  Construct an attribute step.
  */
  constructor(e, t) {
    super(), this.attr = e, this.value = t;
  }
  apply(e) {
    let t = /* @__PURE__ */ Object.create(null);
    for (let i in e.attrs)
      t[i] = e.attrs[i];
    t[this.attr] = this.value;
    let r = e.type.create(t, e.content, e.marks);
    return pe.ok(r);
  }
  getMap() {
    return Qe.empty;
  }
  invert(e) {
    return new ro(this.attr, e.attrs[this.attr]);
  }
  map(e) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(e, t) {
    if (typeof t.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new ro(t.attr, t.value);
  }
}
Le.jsonID("docAttr", ro);
let Zr = class extends Error {
};
Zr = function n(e) {
  let t = Error.call(this, e);
  return t.__proto__ = n.prototype, t;
};
Zr.prototype = Object.create(Error.prototype);
Zr.prototype.constructor = Zr;
Zr.prototype.name = "TransformError";
class jm {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new no();
  }
  /**
  The starting document.
  */
  get before() {
    return this.docs.length ? this.docs[0] : this.doc;
  }
  /**
  Apply a new step in this transform, saving the result. Throws an
  error when the step fails.
  */
  step(e) {
    let t = this.maybeStep(e);
    if (t.failed)
      throw new Zr(t.failed);
    return this;
  }
  /**
  Try to apply a step in this transformation, ignoring it if it
  fails. Returns the step result.
  */
  maybeStep(e) {
    let t = e.apply(this.doc);
    return t.failed || this.addStep(e, t.doc), t;
  }
  /**
  True when the document has been changed (when there are any
  steps).
  */
  get docChanged() {
    return this.steps.length > 0;
  }
  /**
  @internal
  */
  addStep(e, t) {
    this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = t;
  }
  /**
  Replace the part of the document between `from` and `to` with the
  given `slice`.
  */
  replace(e, t = e, r = R.empty) {
    let i = hl(this.doc, e, t, r);
    return i && this.step(i), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, t, r) {
    return this.replace(e, t, new R(N.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, t) {
    return this.replace(e, t, R.empty);
  }
  /**
  Insert the given content at the given position.
  */
  insert(e, t) {
    return this.replaceWith(e, e, t);
  }
  /**
  Replace a range of the document with a given slice, using
  `from`, `to`, and the slice's
  [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
  than fixed start and end points. This method may grow the
  replaced area or close open nodes in the slice in order to get a
  fit that is more in line with WYSIWYG expectations, by dropping
  fully covered parent nodes of the replaced region when they are
  marked [non-defining as
  context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
  open parent node from the slice that _is_ marked as [defining
  its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
  
  This is the method, for example, to handle paste. The similar
  [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
  primitive tool which will _not_ move the start and end of its given
  range, and is useful in situations where you need more precise
  control over what happens.
  */
  replaceRange(e, t, r) {
    return CE(this, e, t, r), this;
  }
  /**
  Replace the given range with a node, but use `from` and `to` as
  hints, rather than precise positions. When from and to are the same
  and are at the start or end of a parent node in which the given
  node doesn't fit, this method may _move_ them out towards a parent
  that does allow the given node to be placed. When the given range
  completely covers a parent node, this method may completely replace
  that parent node.
  */
  replaceRangeWith(e, t, r) {
    return SE(this, e, t, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, t) {
    return xE(this, e, t), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, t) {
    return oE(this, e, t), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, t = 1) {
    return mE(this, e, t), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, t) {
    return aE(this, e, t), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, t = e, r, i = null) {
    return cE(this, e, t, r, i), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, t, r = null, i) {
    return dE(this, e, t, r, i), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, t, r) {
    return this.step(new Pr(e, t, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, t) {
    return this.step(new ro(e, t)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, t) {
    return this.step(new wn(e, t)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, t) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (t instanceof ee)
      t.isInSet(r.marks) && this.step(new ar(e, t));
    else {
      let i = r.marks, o, s = [];
      for (; o = t.isInSet(i); )
        s.push(new ar(e, o)), i = o.removeFromSet(i);
      for (let l = s.length - 1; l >= 0; l--)
        this.step(s[l]);
    }
    return this;
  }
  /**
  Split the node at the given position, and optionally, if `depth` is
  greater than one, any number of nodes above that. By default, the
  parts split off will inherit the node type of the original node.
  This can be changed by passing an array of types and attributes to
  use after the split (with the outermost nodes coming first).
  */
  split(e, t = 1, r) {
    return hE(this, e, t, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, t, r) {
    return nE(this, e, t, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, t, r) {
    return rE(this, e, t, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, t, r) {
    return Yc(this, e, t, r), this;
  }
}
const na = /* @__PURE__ */ Object.create(null);
class U {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, t, r) {
    this.$anchor = e, this.$head = t, this.ranges = r || [new Vm(e.min(t), e.max(t))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let e = this.ranges;
    for (let t = 0; t < e.length; t++)
      if (e[t].$from.pos != e[t].$to.pos)
        return !1;
    return !0;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, !0);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(e, t = R.empty) {
    let r = t.content.lastChild, i = null;
    for (let l = 0; l < t.openEnd; l++)
      i = r, r = r.lastChild;
    let o = e.steps.length, s = this.ranges;
    for (let l = 0; l < s.length; l++) {
      let { $from: a, $to: c } = s[l], u = e.mapping.slice(o);
      e.replaceRange(u.map(a.pos), u.map(c.pos), l ? R.empty : t), l == 0 && Dh(e, o, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(e, t) {
    let r = e.steps.length, i = this.ranges;
    for (let o = 0; o < i.length; o++) {
      let { $from: s, $to: l } = i[o], a = e.mapping.slice(r), c = a.map(s.pos), u = a.map(l.pos);
      o ? e.deleteRange(c, u) : (e.replaceRangeWith(c, u, t), Dh(e, r, t.isInline ? -1 : 1));
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom(e, t, r = !1) {
    let i = e.parent.inlineContent ? new J(e) : Er(e.node(0), e.parent, e.pos, e.index(), t, r);
    if (i)
      return i;
    for (let o = e.depth - 1; o >= 0; o--) {
      let s = t < 0 ? Er(e.node(0), e.node(o), e.before(o + 1), e.index(o), t, r) : Er(e.node(0), e.node(o), e.after(o + 1), e.index(o) + 1, t, r);
      if (s)
        return s;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near(e, t = 1) {
    return this.findFrom(e, t) || this.findFrom(e, -t) || new tt(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return Er(e, e, 0, 0, 1) || new tt(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return Er(e, e, e.content.size, e.childCount, -1) || new tt(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, t) {
    if (!t || !t.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = na[t.type];
    if (!r)
      throw new RangeError(`No selection type ${t.type} defined`);
    return r.fromJSON(e, t);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(e, t) {
    if (e in na)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return na[e] = t, t.prototype.jsonID = e, t;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return J.between(this.$anchor, this.$head).getBookmark();
  }
}
U.prototype.visible = !0;
class Vm {
  /**
  Create a range.
  */
  constructor(e, t) {
    this.$from = e, this.$to = t;
  }
}
let Oh = !1;
function Rh(n) {
  !Oh && !n.parent.inlineContent && (Oh = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + n.parent.type.name + ")"));
}
class J extends U {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, t = e) {
    Rh(e), Rh(t), super(e, t);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(e, t) {
    let r = e.resolve(t.map(this.head));
    if (!r.parent.inlineContent)
      return U.near(r);
    let i = e.resolve(t.map(this.anchor));
    return new J(i.parent.inlineContent ? i : r, r);
  }
  replace(e, t = R.empty) {
    if (super.replace(e, t), t == R.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof J && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new fl(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.anchor != "number" || typeof t.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new J(e.resolve(t.anchor), e.resolve(t.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(e, t, r = t) {
    let i = e.resolve(t);
    return new this(i, r == t ? i : e.resolve(r));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between(e, t, r) {
    let i = e.pos - t.pos;
    if ((!r || i) && (r = i >= 0 ? 1 : -1), !t.parent.inlineContent) {
      let o = U.findFrom(t, r, !0) || U.findFrom(t, -r, !0);
      if (o)
        t = o.$head;
      else
        return U.near(t, r);
    }
    return e.parent.inlineContent || (i == 0 ? e = t : (e = (U.findFrom(e, -r, !0) || U.findFrom(e, r, !0)).$anchor, e.pos < t.pos != i < 0 && (e = t))), new J(e, t);
  }
}
U.jsonID("text", J);
class fl {
  constructor(e, t) {
    this.anchor = e, this.head = t;
  }
  map(e) {
    return new fl(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return J.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class q extends U {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor(e) {
    let t = e.nodeAfter, r = e.node(0).resolve(e.pos + t.nodeSize);
    super(e, r), this.node = t;
  }
  map(e, t) {
    let { deleted: r, pos: i } = t.mapResult(this.anchor), o = e.resolve(i);
    return r ? U.near(o) : new q(o);
  }
  content() {
    return new R(N.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof q && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new Qc(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new q(e.resolve(t.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(e, t) {
    return new q(e.resolve(t));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(e) {
    return !e.isText && e.type.spec.selectable !== !1;
  }
}
q.prototype.visible = !1;
U.jsonID("node", q);
class Qc {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: t, pos: r } = e.mapResult(this.anchor);
    return t ? new fl(r, r) : new Qc(r);
  }
  resolve(e) {
    let t = e.resolve(this.anchor), r = t.nodeAfter;
    return r && q.isSelectable(r) ? new q(t) : U.near(t);
  }
}
class tt extends U {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, t = R.empty) {
    if (t == R.empty) {
      e.delete(0, e.doc.content.size);
      let r = U.atStart(e.doc);
      r.eq(e.selection) || e.setSelection(r);
    } else
      super.replace(e, t);
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(e) {
    return new tt(e);
  }
  map(e) {
    return new tt(e);
  }
  eq(e) {
    return e instanceof tt;
  }
  getBookmark() {
    return vE;
  }
}
U.jsonID("all", tt);
const vE = {
  map() {
    return this;
  },
  resolve(n) {
    return new tt(n);
  }
};
function Er(n, e, t, r, i, o = !1) {
  if (e.inlineContent)
    return J.create(n, t);
  for (let s = r - (i > 0 ? 0 : 1); i > 0 ? s < e.childCount : s >= 0; s += i) {
    let l = e.child(s);
    if (l.isAtom) {
      if (!o && q.isSelectable(l))
        return q.create(n, t - (i < 0 ? l.nodeSize : 0));
    } else {
      let a = Er(n, l, t + i, i < 0 ? l.childCount : 0, i, o);
      if (a)
        return a;
    }
    t += l.nodeSize * i;
  }
  return null;
}
function Dh(n, e, t) {
  let r = n.steps.length - 1;
  if (r < e)
    return;
  let i = n.steps[r];
  if (!(i instanceof we || i instanceof De))
    return;
  let o = n.mapping.maps[r], s;
  o.forEach((l, a, c, u) => {
    s == null && (s = u);
  }), n.setSelection(U.near(n.doc.resolve(s), t));
}
const Lh = 1, Xo = 2, Ph = 4;
class EE extends jm {
  /**
  @internal
  */
  constructor(e) {
    super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = /* @__PURE__ */ Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(e) {
    if (e.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Lh) & ~Xo, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & Lh) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= Xo, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return ee.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(e) {
    return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(e) {
    return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & Xo) > 0;
  }
  /**
  @internal
  */
  addStep(e, t) {
    super.addStep(e, t), this.updated = this.updated & ~Xo, this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(e) {
    return this.time = e, this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(e) {
    return this.selection.replace(this, e), this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(e, t = !0) {
    let r = this.selection;
    return t && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || ee.none))), r.replaceWith(this, e), this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    return this.selection.replace(this), this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(e, t, r) {
    let i = this.doc.type.schema;
    if (t == null)
      return e ? this.replaceSelectionWith(i.text(e), !0) : this.deleteSelection();
    {
      if (r == null && (r = t), !e)
        return this.deleteRange(t, r);
      let o = this.storedMarks;
      if (!o) {
        let s = this.doc.resolve(t);
        o = r == t ? s.marks() : s.marksAcross(this.doc.resolve(r));
      }
      return this.replaceRangeWith(t, r, i.text(e, o)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection(U.near(this.selection.$to)), this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(e, t) {
    return this.meta[typeof e == "string" ? e : e.key] = t, this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(e) {
    return this.meta[typeof e == "string" ? e : e.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let e in this.meta)
      return !1;
    return !0;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    return this.updated |= Ph, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & Ph) > 0;
  }
}
function Bh(n, e) {
  return !e || !n ? n : n.bind(e);
}
class Li {
  constructor(e, t, r) {
    this.name = e, this.init = Bh(t.init, r), this.apply = Bh(t.apply, r);
  }
}
const ME = [
  new Li("doc", {
    init(n) {
      return n.doc || n.schema.topNodeType.createAndFill();
    },
    apply(n) {
      return n.doc;
    }
  }),
  new Li("selection", {
    init(n, e) {
      return n.selection || U.atStart(e.doc);
    },
    apply(n) {
      return n.selection;
    }
  }),
  new Li("storedMarks", {
    init(n) {
      return n.storedMarks || null;
    },
    apply(n, e, t, r) {
      return r.selection.$cursor ? n.storedMarks : null;
    }
  }),
  new Li("scrollToSelection", {
    init() {
      return 0;
    },
    apply(n, e) {
      return n.scrolledIntoView ? e + 1 : e;
    }
  })
];
class ra {
  constructor(e, t) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = ME.slice(), t && t.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new Li(r.key, r.spec.state, r));
    });
  }
}
class Or {
  /**
  @internal
  */
  constructor(e) {
    this.config = e;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(e) {
    return this.applyTransaction(e).state;
  }
  /**
  @internal
  */
  filterTransaction(e, t = -1) {
    for (let r = 0; r < this.config.plugins.length; r++)
      if (r != t) {
        let i = this.config.plugins[r];
        if (i.spec.filterTransaction && !i.spec.filterTransaction.call(i, e, this))
          return !1;
      }
    return !0;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(e) {
    if (!this.filterTransaction(e))
      return { state: this, transactions: [] };
    let t = [e], r = this.applyInner(e), i = null;
    for (; ; ) {
      let o = !1;
      for (let s = 0; s < this.config.plugins.length; s++) {
        let l = this.config.plugins[s];
        if (l.spec.appendTransaction) {
          let a = i ? i[s].n : 0, c = i ? i[s].state : this, u = a < t.length && l.spec.appendTransaction.call(l, a ? t.slice(a) : t, c, r);
          if (u && r.filterTransaction(u, s)) {
            if (u.setMeta("appendedTransaction", e), !i) {
              i = [];
              for (let d = 0; d < this.config.plugins.length; d++)
                i.push(d < s ? { state: r, n: t.length } : { state: this, n: 0 });
            }
            t.push(u), r = r.applyInner(u), o = !0;
          }
          i && (i[s] = { state: r, n: t.length });
        }
      }
      if (!o)
        return { state: r, transactions: t };
    }
  }
  /**
  @internal
  */
  applyInner(e) {
    if (!e.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let t = new Or(this.config), r = this.config.fields;
    for (let i = 0; i < r.length; i++) {
      let o = r[i];
      t[o.name] = o.apply(e, this[o.name], this, t);
    }
    return t;
  }
  /**
  Accessor that constructs and returns a new [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new EE(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let t = new ra(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new Or(t);
    for (let i = 0; i < t.fields.length; i++)
      r[t.fields[i].name] = t.fields[i].init(e, r);
    return r;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(e) {
    let t = new ra(this.schema, e.plugins), r = t.fields, i = new Or(t);
    for (let o = 0; o < r.length; o++) {
      let s = r[o].name;
      i[s] = this.hasOwnProperty(s) ? this[s] : r[o].init(e, i);
    }
    return i;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(e) {
    let t = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks && (t.storedMarks = this.storedMarks.map((r) => r.toJSON())), e && typeof e == "object")
      for (let r in e) {
        if (r == "doc" || r == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let i = e[r], o = i.spec.state;
        o && o.toJSON && (t[r] = o.toJSON.call(i, this[i.key]));
      }
    return t;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(e, t, r) {
    if (!t)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!e.schema)
      throw new RangeError("Required config field 'schema' missing");
    let i = new ra(e.schema, e.plugins), o = new Or(i);
    return i.fields.forEach((s) => {
      if (s.name == "doc")
        o.doc = ht.fromJSON(e.schema, t.doc);
      else if (s.name == "selection")
        o.selection = U.fromJSON(o.doc, t.selection);
      else if (s.name == "storedMarks")
        t.storedMarks && (o.storedMarks = t.storedMarks.map(e.schema.markFromJSON));
      else {
        if (r)
          for (let l in r) {
            let a = r[l], c = a.spec.state;
            if (a.key == s.name && c && c.fromJSON && Object.prototype.hasOwnProperty.call(t, l)) {
              o[s.name] = c.fromJSON.call(a, e, t[l], o);
              return;
            }
          }
        o[s.name] = s.init(e, o);
      }
    }), o;
  }
}
function Um(n, e, t) {
  for (let r in n) {
    let i = n[r];
    i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = Um(i, e, {})), t[r] = i;
  }
  return t;
}
class xe {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && Um(e.props, this, this.props), this.key = e.key ? e.key.key : Wm("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const ia = /* @__PURE__ */ Object.create(null);
function Wm(n) {
  return n in ia ? n + "$" + ++ia[n] : (ia[n] = 0, n + "$");
}
class ge {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = Wm(e);
  }
  /**
  Get the active plugin with this key, if any, from an editor
  state.
  */
  get(e) {
    return e.config.pluginsByKey[this.key];
  }
  /**
  Get the plugin's state from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const Zc = (n, e) => n.selection.empty ? !1 : (e && e(n.tr.deleteSelection().scrollIntoView()), !0);
function Km(n, e) {
  let { $cursor: t } = n.selection;
  return !t || (e ? !e.endOfTextblock("backward", n) : t.parentOffset > 0) ? null : t;
}
const Jm = (n, e, t) => {
  let r = Km(n, t);
  if (!r)
    return !1;
  let i = eu(r);
  if (!i) {
    let s = r.blockRange(), l = s && ul(s);
    return l == null ? !1 : (e && e(n.tr.lift(s, l).scrollIntoView()), !0);
  }
  let o = i.nodeBefore;
  if (Xm(n, i, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (ei(o, "end") || q.isSelectable(o)))
    for (let s = r.depth; ; s--) {
      let l = hl(n.doc, r.before(s), r.after(s), R.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = n.tr.step(l);
          a.setSelection(ei(o, "end") ? U.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : q.create(a.doc, i.pos - o.nodeSize)), e(a.scrollIntoView());
        }
        return !0;
      }
      if (s == 1 || r.node(s - 1).childCount > 1)
        break;
    }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(n.tr.delete(i.pos - o.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, TE = (n, e, t) => {
  let r = Km(n, t);
  if (!r)
    return !1;
  let i = eu(r);
  return i ? NE(n, i, e) : !1;
};
function NE(n, e, t) {
  let r = e.nodeBefore, i = r, o = e.pos - 1;
  for (; !i.isTextblock; o--) {
    if (i.type.spec.isolating)
      return !1;
    let u = i.lastChild;
    if (!u)
      return !1;
    i = u;
  }
  let s = e.nodeAfter, l = s, a = e.pos + 1;
  for (; !l.isTextblock; a++) {
    if (l.type.spec.isolating)
      return !1;
    let u = l.firstChild;
    if (!u)
      return !1;
    l = u;
  }
  let c = hl(n.doc, o, a, R.empty);
  if (!c || c.from != o || c instanceof we && c.slice.size >= a - o)
    return !1;
  if (t) {
    let u = n.tr.step(c);
    u.setSelection(J.create(u.doc, o)), t(u.scrollIntoView());
  }
  return !0;
}
function ei(n, e, t = !1) {
  for (let r = n; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (t && r.childCount != 1)
      return !1;
  }
  return !1;
}
const Gm = (n, e, t) => {
  let { $head: r, empty: i } = n.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (t ? !t.endOfTextblock("backward", n) : r.parentOffset > 0)
      return !1;
    o = eu(r);
  }
  let s = o && o.nodeBefore;
  return !s || !q.isSelectable(s) ? !1 : (e && e(n.tr.setSelection(q.create(n.doc, o.pos - s.nodeSize)).scrollIntoView()), !0);
};
function eu(n) {
  if (!n.parent.type.spec.isolating)
    for (let e = n.depth - 1; e >= 0; e--) {
      if (n.index(e) > 0)
        return n.doc.resolve(n.before(e + 1));
      if (n.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function IE(n, e) {
  let { $cursor: t } = n.selection;
  return !t || (e ? !e.endOfTextblock("forward", n) : t.parentOffset < t.parent.content.size) ? null : t;
}
const AE = (n, e, t) => {
  let r = IE(n, t);
  if (!r)
    return !1;
  let i = Ym(r);
  if (!i)
    return !1;
  let o = i.nodeAfter;
  if (Xm(n, i, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (ei(o, "start") || q.isSelectable(o))) {
    let s = hl(n.doc, r.before(), r.after(), R.empty);
    if (s && s.slice.size < s.to - s.from) {
      if (e) {
        let l = n.tr.step(s);
        l.setSelection(ei(o, "start") ? U.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : q.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
      }
      return !0;
    }
  }
  return o.isAtom && i.depth == r.depth - 1 ? (e && e(n.tr.delete(i.pos, i.pos + o.nodeSize).scrollIntoView()), !0) : !1;
}, OE = (n, e, t) => {
  let { $head: r, empty: i } = n.selection, o = r;
  if (!i)
    return !1;
  if (r.parent.isTextblock) {
    if (t ? !t.endOfTextblock("forward", n) : r.parentOffset < r.parent.content.size)
      return !1;
    o = Ym(r);
  }
  let s = o && o.nodeAfter;
  return !s || !q.isSelectable(s) ? !1 : (e && e(n.tr.setSelection(q.create(n.doc, o.pos)).scrollIntoView()), !0);
};
function Ym(n) {
  if (!n.parent.type.spec.isolating)
    for (let e = n.depth - 1; e >= 0; e--) {
      let t = n.node(e);
      if (n.index(e) + 1 < t.childCount)
        return n.doc.resolve(n.after(e + 1));
      if (t.type.spec.isolating)
        break;
    }
  return null;
}
const RE = (n, e) => {
  let { $head: t, $anchor: r } = n.selection;
  return !t.parent.type.spec.code || !t.sameParent(r) ? !1 : (e && e(n.tr.insertText(`
`).scrollIntoView()), !0);
};
function tu(n) {
  for (let e = 0; e < n.edgeCount; e++) {
    let { type: t } = n.edge(e);
    if (t.isTextblock && !t.hasRequiredAttrs())
      return t;
  }
  return null;
}
const DE = (n, e) => {
  let { $head: t, $anchor: r } = n.selection;
  if (!t.parent.type.spec.code || !t.sameParent(r))
    return !1;
  let i = t.node(-1), o = t.indexAfter(-1), s = tu(i.contentMatchAt(o));
  if (!s || !i.canReplaceWith(o, o, s))
    return !1;
  if (e) {
    let l = t.after(), a = n.tr.replaceWith(l, l, s.createAndFill());
    a.setSelection(U.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
  }
  return !0;
}, LE = (n, e) => {
  let t = n.selection, { $from: r, $to: i } = t;
  if (t instanceof tt || r.parent.inlineContent || i.parent.inlineContent)
    return !1;
  let o = tu(i.parent.contentMatchAt(i.indexAfter()));
  if (!o || !o.isTextblock)
    return !1;
  if (e) {
    let s = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = n.tr.insert(s, o.createAndFill());
    l.setSelection(J.create(l.doc, s + 1)), e(l.scrollIntoView());
  }
  return !0;
}, PE = (n, e) => {
  let { $cursor: t } = n.selection;
  if (!t || t.parent.content.size)
    return !1;
  if (t.depth > 1 && t.after() != t.end(-1)) {
    let o = t.before();
    if (Hi(n.doc, o))
      return e && e(n.tr.split(o).scrollIntoView()), !0;
  }
  let r = t.blockRange(), i = r && ul(r);
  return i == null ? !1 : (e && e(n.tr.lift(r, i).scrollIntoView()), !0);
};
function BE(n) {
  return (e, t) => {
    let { $from: r, $to: i } = e.selection;
    if (e.selection instanceof q && e.selection.node.isBlock)
      return !r.parentOffset || !Hi(e.doc, r.pos) ? !1 : (t && t(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let o = [], s, l, a = !1, c = !1;
    for (let f = r.depth; ; f--)
      if (r.node(f).isBlock) {
        a = r.end(f) == r.pos + (r.depth - f), c = r.start(f) == r.pos - (r.depth - f), l = tu(r.node(f - 1).contentMatchAt(r.indexAfter(f - 1))), o.unshift(a && l ? { type: l } : null), s = f;
        break;
      } else {
        if (f == 1)
          return !1;
        o.unshift(null);
      }
    let u = e.tr;
    (e.selection instanceof J || e.selection instanceof tt) && u.deleteSelection();
    let d = u.mapping.map(r.pos), h = Hi(u.doc, d, o.length, o);
    if (h || (o[0] = l ? { type: l } : null, h = Hi(u.doc, d, o.length, o)), !h)
      return !1;
    if (u.split(d, o.length, o), !a && c && r.node(s).type != l) {
      let f = u.mapping.map(r.before(s)), p = u.doc.resolve(f);
      l && r.node(s - 1).canReplaceWith(p.index(), p.index() + 1, l) && u.setNodeMarkup(u.mapping.map(r.before(s)), l);
    }
    return t && t(u.scrollIntoView()), !0;
  };
}
const $E = BE(), zE = (n, e) => (e && e(n.tr.setSelection(new tt(n.doc))), !0);
function FE(n, e, t) {
  let r = e.nodeBefore, i = e.nodeAfter, o = e.index();
  return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && e.parent.canReplace(o - 1, o) ? (t && t(n.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(o, o + 1) || !(i.isTextblock || dl(n.doc, e.pos)) ? !1 : (t && t(n.tr.join(e.pos).scrollIntoView()), !0);
}
function Xm(n, e, t, r) {
  let i = e.nodeBefore, o = e.nodeAfter, s, l, a = i.type.spec.isolating || o.type.spec.isolating;
  if (!a && FE(n, e, t))
    return !0;
  let c = !a && e.parent.canReplace(e.index(), e.index() + 1);
  if (c && (s = (l = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && l.matchType(s[0] || o.type).validEnd) {
    if (t) {
      let f = e.pos + o.nodeSize, p = N.empty;
      for (let g = s.length - 1; g >= 0; g--)
        p = N.from(s[g].create(null, p));
      p = N.from(i.copy(p));
      let m = n.tr.step(new De(e.pos - 1, f, e.pos, f, new R(p, 1, 0), s.length, !0)), y = m.doc.resolve(f + 2 * s.length);
      y.nodeAfter && y.nodeAfter.type == i.type && dl(m.doc, y.pos) && m.join(y.pos), t(m.scrollIntoView());
    }
    return !0;
  }
  let u = o.type.spec.isolating || r > 0 && a ? null : U.findFrom(e, 1), d = u && u.$from.blockRange(u.$to), h = d && ul(d);
  if (h != null && h >= e.depth)
    return t && t(n.tr.lift(d, h).scrollIntoView()), !0;
  if (c && ei(o, "start", !0) && ei(i, "end")) {
    let f = i, p = [];
    for (; p.push(f), !f.isTextblock; )
      f = f.lastChild;
    let m = o, y = 1;
    for (; !m.isTextblock; m = m.firstChild)
      y++;
    if (f.canReplace(f.childCount, f.childCount, m.content)) {
      if (t) {
        let g = N.empty;
        for (let x = p.length - 1; x >= 0; x--)
          g = N.from(p[x].copy(g));
        let C = n.tr.step(new De(e.pos - p.length, e.pos + o.nodeSize, e.pos + y, e.pos + o.nodeSize - y, new R(g, p.length, 0), 0, !0));
        t(C.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function Qm(n) {
  return function(e, t) {
    let r = e.selection, i = n < 0 ? r.$from : r.$to, o = i.depth;
    for (; i.node(o).isInline; ) {
      if (!o)
        return !1;
      o--;
    }
    return i.node(o).isTextblock ? (t && t(e.tr.setSelection(J.create(e.doc, n < 0 ? i.start(o) : i.end(o)))), !0) : !1;
  };
}
const _E = Qm(-1), HE = Qm(1);
function nu(n, e = null) {
  return function(t, r) {
    let { $from: i, $to: o } = t.selection, s = i.blockRange(o), l = s && Xc(s, n, e);
    return l ? (r && r(t.tr.wrap(s, l).scrollIntoView()), !0) : !1;
  };
}
function io(n, e = null) {
  return function(t, r) {
    let i = !1;
    for (let o = 0; o < t.selection.ranges.length && !i; o++) {
      let { $from: { pos: s }, $to: { pos: l } } = t.selection.ranges[o];
      t.doc.nodesBetween(s, l, (a, c) => {
        if (i)
          return !1;
        if (!(!a.isTextblock || a.hasMarkup(n, e)))
          if (a.type == n)
            i = !0;
          else {
            let u = t.doc.resolve(c), d = u.index();
            i = u.parent.canReplaceWith(d, d + 1, n);
          }
      });
    }
    if (!i)
      return !1;
    if (r) {
      let o = t.tr;
      for (let s = 0; s < t.selection.ranges.length; s++) {
        let { $from: { pos: l }, $to: { pos: a } } = t.selection.ranges[s];
        o.setBlockType(l, a, n, e);
      }
      r(o.scrollIntoView());
    }
    return !0;
  };
}
function qE(n, e, t, r) {
  for (let i = 0; i < e.length; i++) {
    let { $from: o, $to: s } = e[i], l = o.depth == 0 ? n.inlineContent && n.type.allowsMarkType(t) : !1;
    if (n.nodesBetween(o.pos, s.pos, (a, c) => {
      if (l)
        return !1;
      l = a.inlineContent && a.type.allowsMarkType(t);
    }), l)
      return !0;
  }
  return !1;
}
function Qt(n, e = null, t) {
  return function(r, i) {
    let { empty: o, $cursor: s, ranges: l } = r.selection;
    if (o && !s || !qE(r.doc, l, n))
      return !1;
    if (i)
      if (s)
        n.isInSet(r.storedMarks || s.marks()) ? i(r.tr.removeStoredMark(n)) : i(r.tr.addStoredMark(n.create(e)));
      else {
        let a, c = r.tr;
        a = !l.some((u) => r.doc.rangeHasMark(u.$from.pos, u.$to.pos, n));
        for (let u = 0; u < l.length; u++) {
          let { $from: d, $to: h } = l[u];
          if (!a)
            c.removeMark(d.pos, h.pos, n);
          else {
            let f = d.pos, p = h.pos, m = d.nodeAfter, y = h.nodeBefore, g = m && m.isText ? /^\s*/.exec(m.text)[0].length : 0, C = y && y.isText ? /\s*$/.exec(y.text)[0].length : 0;
            f + g < p && (f += g, p -= C), c.addMark(f, p, n.create(e));
          }
        }
        i(c.scrollIntoView());
      }
    return !0;
  };
}
function li(...n) {
  return function(e, t, r) {
    for (let i = 0; i < n.length; i++)
      if (n[i](e, t, r))
        return !0;
    return !1;
  };
}
let oa = li(Zc, Jm, Gm), $h = li(Zc, AE, OE);
const Ut = {
  Enter: li(RE, LE, PE, $E),
  "Mod-Enter": DE,
  Backspace: oa,
  "Mod-Backspace": oa,
  "Shift-Backspace": oa,
  Delete: $h,
  "Mod-Delete": $h,
  "Mod-a": zE
}, Zm = {
  "Ctrl-h": Ut.Backspace,
  "Alt-Backspace": Ut["Mod-Backspace"],
  "Ctrl-d": Ut.Delete,
  "Ctrl-Alt-Backspace": Ut["Mod-Delete"],
  "Alt-Delete": Ut["Mod-Delete"],
  "Alt-d": Ut["Mod-Delete"],
  "Ctrl-a": _E,
  "Ctrl-e": HE
};
for (let n in Ut)
  Zm[n] = Ut[n];
const jE = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : !1, VE = jE ? Zm : Ut;
class it {
  /**
  Create an input rule. The rule applies when the user typed
  something and the text directly in front of the cursor matches
  `match`, which should end with `$`.
  
  The `handler` can be a string, in which case the matched text, or
  the first matched group in the regexp, is replaced by that
  string.
  
  Or a it can be a function, which will be called with the match
  array produced by
  [`RegExp.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec),
  as well as the start and end of the matched range, and which can
  return a [transaction](https://prosemirror.net/docs/ref/#state.Transaction) that describes the
  rule's effect, or null to indicate the input was not handled.
  */
  constructor(e, t, r = {}) {
    this.match = e, this.match = e, this.handler = typeof t == "string" ? UE(t) : t, this.undoable = r.undoable !== !1, this.inCode = r.inCode || !1, this.inCodeMark = r.inCodeMark !== !1;
  }
}
function UE(n) {
  return function(e, t, r, i) {
    let o = n;
    if (t[1]) {
      let s = t[0].lastIndexOf(t[1]);
      o += t[0].slice(s + t[1].length), r += s;
      let l = r - i;
      l > 0 && (o = t[0].slice(s - l, s) + o, r = i);
    }
    return e.tr.insertText(o, r, i);
  };
}
const WE = (n, e) => {
  let t = n.plugins;
  for (let r = 0; r < t.length; r++) {
    let i = t[r], o;
    if (i.spec.isInputRules && (o = i.getState(n))) {
      if (e) {
        let s = n.tr, l = o.transform;
        for (let a = l.steps.length - 1; a >= 0; a--)
          s.step(l.steps[a].invert(l.docs[a]));
        if (o.text) {
          let a = s.doc.resolve(o.from).marks();
          s.replaceWith(o.from, o.to, n.schema.text(o.text, a));
        } else
          s.delete(o.from, o.to);
        e(s);
      }
      return !0;
    }
  }
  return !1;
};
new it(/--$/, "—", { inCodeMark: !1 });
new it(/\.\.\.$/, "…", { inCodeMark: !1 });
new it(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 });
new it(/"$/, "”", { inCodeMark: !1 });
new it(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 });
new it(/'$/, "’", { inCodeMark: !1 });
function ru(n, e, t = null, r) {
  return new it(n, (i, o, s, l) => {
    let a = t instanceof Function ? t(o) : t, c = i.tr.delete(s, l), u = c.doc.resolve(s), d = u.blockRange(), h = d && Xc(d, e, a);
    if (!h)
      return null;
    c.wrap(d, h);
    let f = c.doc.resolve(s - 1).nodeBefore;
    return f && f.type == e && dl(c.doc, s - 1) && (!r || r(o, f)) && c.join(s - 1), c;
  });
}
function eg(n, e, t = null) {
  return new it(n, (r, i, o, s) => {
    let l = r.doc.resolve(o), a = t instanceof Function ? t(i) : t;
    return l.node(-1).canReplaceWith(l.index(-1), l.indexAfter(-1), e) ? r.tr.delete(o, s).setBlockType(o, o, e, a) : null;
  });
}
const In = typeof navigator < "u" ? navigator : null, zh = typeof document < "u" ? document : null, fr = In && In.userAgent || "", oc = /Edge\/(\d+)/.exec(fr), tg = /MSIE \d/.exec(fr), sc = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(fr), iu = !!(tg || sc || oc);
tg ? document.documentMode : sc ? +sc[1] : oc && +oc[1];
const KE = !iu && /gecko\/(\d+)/i.test(fr);
KE && +(/Firefox\/(\d+)/.exec(fr) || [0, 0])[1];
const Fh = !iu && /Chrome\/(\d+)/.exec(fr);
Fh && +Fh[1];
const JE = !iu && !!In && /Apple Computer/.test(In.vendor), GE = JE && (/Mobile\/\w+/.test(fr) || !!In && In.maxTouchPoints > 2);
GE || In && /Mac/.test(In.platform);
const YE = !!zh && "webkitFontSmoothing" in zh.documentElement.style;
YE && +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1];
function sa(n, e, t, r, i, o) {
  if (n.composing) return !1;
  const s = n.state, l = s.doc.resolve(e);
  if (l.parent.type.spec.code) return !1;
  const a = l.parent.textBetween(
    Math.max(0, l.parentOffset - 500),
    l.parentOffset,
    void 0,
    "￼"
  ) + r;
  for (let c of i) {
    const u = c, d = u.match.exec(a), h = d && d[0] && u.handler(s, d, e - (d[0].length - r.length), t);
    if (h)
      return u.undoable !== !1 && h.setMeta(o, { transform: h, from: e, to: t, text: r }), n.dispatch(h), !0;
  }
  return !1;
}
const XE = new ge("MILKDOWN_CUSTOM_INPUTRULES");
function QE({ rules: n }) {
  const e = new xe({
    key: XE,
    isInputRules: !0,
    state: {
      init() {
        return null;
      },
      apply(t, r) {
        const i = t.getMeta(this);
        return i || (t.selectionSet || t.docChanged ? null : r);
      }
    },
    props: {
      handleTextInput(t, r, i, o) {
        return sa(t, r, i, o, n, e);
      },
      handleDOMEvents: {
        compositionend: (t) => (setTimeout(() => {
          const { $cursor: r } = t.state.selection;
          r && sa(t, r.pos, r.pos, "", n, e);
        }), !1)
      },
      handleKeyDown(t, r) {
        if (r.key !== "Enter") return !1;
        const { $cursor: i } = t.state.selection;
        return i ? sa(t, i.pos, i.pos, `
`, n, e) : !1;
      }
    }
  });
  return e;
}
function Eo(n, e, t = {}) {
  return new it(n, (r, i, o, s) => {
    var l, a, c, u;
    const { tr: d } = r, h = i.length;
    let f = i[h - 1], p = i[0], m = [], y = s;
    const g = {
      group: f,
      fullMatch: p,
      start: o,
      end: s
    }, C = (l = t.updateCaptured) == null ? void 0 : l.call(t, g);
    if (Object.assign(g, C), { group: f, fullMatch: p, start: o, end: s } = g, p === null || f?.trim() === "") return null;
    if (f) {
      const x = p.search(/\S/), L = o + p.indexOf(f), D = L + f.length;
      m = (a = d.storedMarks) != null ? a : [], D < s && d.delete(D, s), L > o && d.delete(o + x, L), y = o + x + f.length;
      const w = (c = t.getAttr) == null ? void 0 : c.call(t, i);
      d.addMark(o, y, e.create(w)), d.setStoredMarks(m), (u = t.beforeDispatch) == null || u.call(t, { match: i, start: o, end: s, tr: d });
    }
    return d;
  });
}
function ng(n) {
  return Object.assign(Object.create(n), n).setTime(Date.now());
}
function ZE(n, e) {
  return Array.isArray(n) && n.includes(e.type) || e.type === n;
}
function eM(n) {
  return (e) => {
    for (let t = e.depth; t > 0; t -= 1) {
      const r = e.node(t);
      if (n(r)) {
        const i = e.before(t), o = e.after(t);
        return {
          from: i,
          to: o,
          node: r
        };
      }
    }
  };
}
function tM(n, e) {
  return eM((t) => t.type === e)(n);
}
function nM(n) {
  return (e) => {
    for (let t = e.depth; t > 0; t--) {
      const r = e.node(t);
      if (n(r))
        return {
          pos: t > 0 ? e.before(t) : 0,
          start: e.start(t),
          depth: t,
          node: r
        };
    }
  };
}
function rM(n, e) {
  if (!(n instanceof q)) return;
  const { node: t, $from: r } = n;
  if (ZE(e, t))
    return {
      node: t,
      pos: r.pos,
      start: r.start(r.depth),
      depth: r.depth
    };
}
const iM = (n, e) => {
  const { selection: t, doc: r } = n;
  if (t instanceof q)
    return {
      hasNode: t.node.type === e,
      pos: t.from,
      target: t.node
    };
  const { from: i, to: o } = t;
  let s = !1, l = -1, a = null;
  return r.nodesBetween(i, o, (c, u) => a ? !1 : c.type === e ? (s = !0, l = u, a = c, !1) : !0), {
    hasNode: s,
    pos: l,
    target: a
  };
};
var An = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
}, qs = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
}, oM = typeof navigator < "u" && /Mac/.test(navigator.platform), sM = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var Te = 0; Te < 10; Te++) An[48 + Te] = An[96 + Te] = String(Te);
for (var Te = 1; Te <= 24; Te++) An[Te + 111] = "F" + Te;
for (var Te = 65; Te <= 90; Te++)
  An[Te] = String.fromCharCode(Te + 32), qs[Te] = String.fromCharCode(Te);
for (var la in An) qs.hasOwnProperty(la) || (qs[la] = An[la]);
function lM(n) {
  var e = oM && n.metaKey && n.shiftKey && !n.ctrlKey && !n.altKey || sM && n.shiftKey && n.key && n.key.length == 1 || n.key == "Unidentified", t = !e && n.key || (n.shiftKey ? qs : An)[n.keyCode] || n.key || "Unidentified";
  return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
const aM = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), cM = typeof navigator < "u" && /Win/.test(navigator.platform);
function uM(n) {
  let e = n.split(/-(?!$)/), t = e[e.length - 1];
  t == "Space" && (t = " ");
  let r, i, o, s;
  for (let l = 0; l < e.length - 1; l++) {
    let a = e[l];
    if (/^(cmd|meta|m)$/i.test(a))
      s = !0;
    else if (/^a(lt)?$/i.test(a))
      r = !0;
    else if (/^(c|ctrl|control)$/i.test(a))
      i = !0;
    else if (/^s(hift)?$/i.test(a))
      o = !0;
    else if (/^mod$/i.test(a))
      aM ? s = !0 : i = !0;
    else
      throw new Error("Unrecognized modifier name: " + a);
  }
  return r && (t = "Alt-" + t), i && (t = "Ctrl-" + t), s && (t = "Meta-" + t), o && (t = "Shift-" + t), t;
}
function dM(n) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let t in n)
    e[uM(t)] = n[t];
  return e;
}
function aa(n, e, t = !0) {
  return e.altKey && (n = "Alt-" + n), e.ctrlKey && (n = "Ctrl-" + n), e.metaKey && (n = "Meta-" + n), t && e.shiftKey && (n = "Shift-" + n), n;
}
function hM(n) {
  return new xe({ props: { handleKeyDown: rg(n) } });
}
function rg(n) {
  let e = dM(n);
  return function(t, r) {
    let i = lM(r), o, s = e[aa(i, r)];
    if (s && s(t.state, t.dispatch, t))
      return !0;
    if (i.length == 1 && i != " ") {
      if (r.shiftKey) {
        let l = e[aa(i, r, !1)];
        if (l && l(t.state, t.dispatch, t))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(cM && r.ctrlKey && r.altKey) && (o = An[r.keyCode]) && o != i) {
        let l = e[aa(o, r)];
        if (l && l(t.state, t.dispatch, t))
          return !0;
      }
    }
    return !1;
  };
}
const Ne = function(n) {
  for (var e = 0; ; e++)
    if (n = n.previousSibling, !n)
      return e;
}, ti = function(n) {
  let e = n.assignedSlot || n.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let lc = null;
const Vt = function(n, e, t) {
  let r = lc || (lc = document.createRange());
  return r.setEnd(n, t ?? n.nodeValue.length), r.setStart(n, e || 0), r;
}, fM = function() {
  lc = null;
}, cr = function(n, e, t, r) {
  return t && (_h(n, e, t, r, -1) || _h(n, e, t, r, 1));
}, pM = /^(img|br|input|textarea|hr)$/i;
function _h(n, e, t, r, i) {
  for (var o; ; ) {
    if (n == t && e == r)
      return !0;
    if (e == (i < 0 ? 0 : dt(n))) {
      let s = n.parentNode;
      if (!s || s.nodeType != 1 || Mo(n) || pM.test(n.nodeName) || n.contentEditable == "false")
        return !1;
      e = Ne(n) + (i < 0 ? 0 : 1), n = s;
    } else if (n.nodeType == 1) {
      let s = n.childNodes[e + (i < 0 ? -1 : 0)];
      if (s.nodeType == 1 && s.contentEditable == "false")
        if (!((o = s.pmViewDesc) === null || o === void 0) && o.ignoreForSelection)
          e += i;
        else
          return !1;
      else
        n = s, e = i < 0 ? dt(n) : 0;
    } else
      return !1;
  }
}
function dt(n) {
  return n.nodeType == 3 ? n.nodeValue.length : n.childNodes.length;
}
function mM(n, e) {
  for (; ; ) {
    if (n.nodeType == 3 && e)
      return n;
    if (n.nodeType == 1 && e > 0) {
      if (n.contentEditable == "false")
        return null;
      n = n.childNodes[e - 1], e = dt(n);
    } else if (n.parentNode && !Mo(n))
      e = Ne(n), n = n.parentNode;
    else
      return null;
  }
}
function gM(n, e) {
  for (; ; ) {
    if (n.nodeType == 3 && e < n.nodeValue.length)
      return n;
    if (n.nodeType == 1 && e < n.childNodes.length) {
      if (n.contentEditable == "false")
        return null;
      n = n.childNodes[e], e = 0;
    } else if (n.parentNode && !Mo(n))
      e = Ne(n) + 1, n = n.parentNode;
    else
      return null;
  }
}
function yM(n, e, t) {
  for (let r = e == 0, i = e == dt(n); r || i; ) {
    if (n == t)
      return !0;
    let o = Ne(n);
    if (n = n.parentNode, !n)
      return !1;
    r = r && o == 0, i = i && o == dt(n);
  }
}
function Mo(n) {
  let e;
  for (let t = n; t && !(e = t.pmViewDesc); t = t.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == n || e.contentDOM == n);
}
const pl = function(n) {
  return n.focusNode && cr(n.focusNode, n.focusOffset, n.anchorNode, n.anchorOffset);
};
function qn(n, e) {
  let t = document.createEvent("Event");
  return t.initEvent("keydown", !0, !0), t.keyCode = n, t.key = t.code = e, t;
}
function bM(n) {
  let e = n.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function kM(n, e, t) {
  if (n.caretPositionFromPoint)
    try {
      let r = n.caretPositionFromPoint(e, t);
      if (r)
        return { node: r.offsetNode, offset: Math.min(dt(r.offsetNode), r.offset) };
    } catch {
    }
  if (n.caretRangeFromPoint) {
    let r = n.caretRangeFromPoint(e, t);
    if (r)
      return { node: r.startContainer, offset: Math.min(dt(r.startContainer), r.startOffset) };
  }
}
const Rt = typeof navigator < "u" ? navigator : null, Hh = typeof document < "u" ? document : null, Dn = Rt && Rt.userAgent || "", ac = /Edge\/(\d+)/.exec(Dn), ig = /MSIE \d/.exec(Dn), cc = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Dn), Ve = !!(ig || cc || ac), vn = ig ? document.documentMode : cc ? +cc[1] : ac ? +ac[1] : 0, ft = !Ve && /gecko\/(\d+)/i.test(Dn);
ft && +(/Firefox\/(\d+)/.exec(Dn) || [0, 0])[1];
const uc = !Ve && /Chrome\/(\d+)/.exec(Dn), Re = !!uc, og = uc ? +uc[1] : 0, Be = !Ve && !!Rt && /Apple Computer/.test(Rt.vendor), ni = Be && (/Mobile\/\w+/.test(Dn) || !!Rt && Rt.maxTouchPoints > 2), ct = ni || (Rt ? /Mac/.test(Rt.platform) : !1), wM = Rt ? /Win/.test(Rt.platform) : !1, en = /Android \d/.test(Dn), To = !!Hh && "webkitFontSmoothing" in Hh.documentElement.style, CM = To ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function SM(n) {
  let e = n.defaultView && n.defaultView.visualViewport;
  return e ? {
    left: 0,
    right: e.width,
    top: 0,
    bottom: e.height
  } : {
    left: 0,
    right: n.documentElement.clientWidth,
    top: 0,
    bottom: n.documentElement.clientHeight
  };
}
function Ht(n, e) {
  return typeof n == "number" ? n : n[e];
}
function xM(n) {
  let e = n.getBoundingClientRect(), t = e.width / n.offsetWidth || 1, r = e.height / n.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + n.clientWidth * t,
    top: e.top,
    bottom: e.top + n.clientHeight * r
  };
}
function qh(n, e, t) {
  let r = n.someProp("scrollThreshold") || 0, i = n.someProp("scrollMargin") || 5, o = n.dom.ownerDocument;
  for (let s = t || n.dom; s; ) {
    if (s.nodeType != 1) {
      s = ti(s);
      continue;
    }
    let l = s, a = l == o.body, c = a ? SM(o) : xM(l), u = 0, d = 0;
    if (e.top < c.top + Ht(r, "top") ? d = -(c.top - e.top + Ht(i, "top")) : e.bottom > c.bottom - Ht(r, "bottom") && (d = e.bottom - e.top > c.bottom - c.top ? e.top + Ht(i, "top") - c.top : e.bottom - c.bottom + Ht(i, "bottom")), e.left < c.left + Ht(r, "left") ? u = -(c.left - e.left + Ht(i, "left")) : e.right > c.right - Ht(r, "right") && (u = e.right - c.right + Ht(i, "right")), u || d)
      if (a)
        o.defaultView.scrollBy(u, d);
      else {
        let f = l.scrollLeft, p = l.scrollTop;
        d && (l.scrollTop += d), u && (l.scrollLeft += u);
        let m = l.scrollLeft - f, y = l.scrollTop - p;
        e = { left: e.left - m, top: e.top - y, right: e.right - m, bottom: e.bottom - y };
      }
    let h = a ? "fixed" : getComputedStyle(s).position;
    if (/^(fixed|sticky)$/.test(h))
      break;
    s = h == "absolute" ? s.offsetParent : ti(s);
  }
}
function vM(n) {
  let e = n.dom.getBoundingClientRect(), t = Math.max(0, e.top), r, i;
  for (let o = (e.left + e.right) / 2, s = t + 1; s < Math.min(innerHeight, e.bottom); s += 5) {
    let l = n.root.elementFromPoint(o, s);
    if (!l || l == n.dom || !n.dom.contains(l))
      continue;
    let a = l.getBoundingClientRect();
    if (a.top >= t - 20) {
      r = l, i = a.top;
      break;
    }
  }
  return { refDOM: r, refTop: i, stack: sg(n.dom) };
}
function sg(n) {
  let e = [], t = n.ownerDocument;
  for (let r = n; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), n != t); r = ti(r))
    ;
  return e;
}
function EM({ refDOM: n, refTop: e, stack: t }) {
  let r = n ? n.getBoundingClientRect().top : 0;
  lg(t, r == 0 ? 0 : r - e);
}
function lg(n, e) {
  for (let t = 0; t < n.length; t++) {
    let { dom: r, top: i, left: o } = n[t];
    r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != o && (r.scrollLeft = o);
  }
}
let wr = null;
function MM(n) {
  if (n.setActive)
    return n.setActive();
  if (wr)
    return n.focus(wr);
  let e = sg(n);
  n.focus(wr == null ? {
    get preventScroll() {
      return wr = { preventScroll: !0 }, !0;
    }
  } : void 0), wr || (wr = !1, lg(e, 0));
}
function ag(n, e) {
  let t, r = 2e8, i, o = 0, s = e.top, l = e.top, a, c;
  for (let u = n.firstChild, d = 0; u; u = u.nextSibling, d++) {
    let h;
    if (u.nodeType == 1)
      h = u.getClientRects();
    else if (u.nodeType == 3)
      h = Vt(u).getClientRects();
    else
      continue;
    for (let f = 0; f < h.length; f++) {
      let p = h[f];
      if (p.top <= s && p.bottom >= l) {
        s = Math.max(p.bottom, s), l = Math.min(p.top, l);
        let m = p.left > e.left ? p.left - e.left : p.right < e.left ? e.left - p.right : 0;
        if (m < r) {
          t = u, r = m, i = m && t.nodeType == 3 ? {
            left: p.right < e.left ? p.right : p.left,
            top: e.top
          } : e, u.nodeType == 1 && m && (o = d + (e.left >= (p.left + p.right) / 2 ? 1 : 0));
          continue;
        }
      } else p.top > e.top && !a && p.left <= e.left && p.right >= e.left && (a = u, c = { left: Math.max(p.left, Math.min(p.right, e.left)), top: p.top });
      !t && (e.left >= p.right && e.top >= p.top || e.left >= p.left && e.top >= p.bottom) && (o = d + 1);
    }
  }
  return !t && a && (t = a, i = c, r = 0), t && t.nodeType == 3 ? TM(t, i) : !t || r && t.nodeType == 1 ? { node: n, offset: o } : ag(t, i);
}
function TM(n, e) {
  let t = n.nodeValue.length, r = document.createRange();
  for (let i = 0; i < t; i++) {
    r.setEnd(n, i + 1), r.setStart(n, i);
    let o = hn(r, 1);
    if (o.top != o.bottom && ou(e, o))
      return { node: n, offset: i + (e.left >= (o.left + o.right) / 2 ? 1 : 0) };
  }
  return { node: n, offset: 0 };
}
function ou(n, e) {
  return n.left >= e.left - 1 && n.left <= e.right + 1 && n.top >= e.top - 1 && n.top <= e.bottom + 1;
}
function NM(n, e) {
  let t = n.parentNode;
  return t && /^li$/i.test(t.nodeName) && e.left < n.getBoundingClientRect().left ? t : n;
}
function IM(n, e, t) {
  let { node: r, offset: i } = ag(e, t), o = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let s = r.getBoundingClientRect();
    o = s.left != s.right && t.left > (s.left + s.right) / 2 ? 1 : -1;
  }
  return n.docView.posFromDOM(r, i, o);
}
function AM(n, e, t, r) {
  let i = -1;
  for (let o = e, s = !1; o != n.dom; ) {
    let l = n.docView.nearestDesc(o, !0), a;
    if (!l)
      return null;
    if (l.dom.nodeType == 1 && (l.node.isBlock && l.parent || !l.contentDOM) && // Ignore elements with zero-size bounding rectangles
    ((a = l.dom.getBoundingClientRect()).width || a.height) && (l.node.isBlock && l.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(l.dom.nodeName) && (!s && a.left > r.left || a.top > r.top ? i = l.posBefore : (!s && a.right < r.left || a.bottom < r.top) && (i = l.posAfter), s = !0), !l.contentDOM && i < 0 && !l.node.isText))
      return (l.node.isBlock ? r.top < (a.top + a.bottom) / 2 : r.left < (a.left + a.right) / 2) ? l.posBefore : l.posAfter;
    o = l.dom.parentNode;
  }
  return i > -1 ? i : n.docView.posFromDOM(e, t, -1);
}
function cg(n, e, t) {
  let r = n.childNodes.length;
  if (r && t.top < t.bottom)
    for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - t.top) / (t.bottom - t.top)) - 2)), o = i; ; ) {
      let s = n.childNodes[o];
      if (s.nodeType == 1) {
        let l = s.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let c = l[a];
          if (ou(e, c))
            return cg(s, e, c);
        }
      }
      if ((o = (o + 1) % r) == i)
        break;
    }
  return n;
}
function OM(n, e) {
  let t = n.dom.ownerDocument, r, i = 0, o = kM(t, e.left, e.top);
  o && ({ node: r, offset: i } = o);
  let s = (n.root.elementFromPoint ? n.root : t).elementFromPoint(e.left, e.top), l;
  if (!s || !n.dom.contains(s.nodeType != 1 ? s.parentNode : s)) {
    let c = n.dom.getBoundingClientRect();
    if (!ou(e, c) || (s = cg(n.dom, e, c), !s))
      return null;
  }
  if (Be)
    for (let c = s; r && c; c = ti(c))
      c.draggable && (r = void 0);
  if (s = NM(s, e), r) {
    if (ft && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
      let u = r.childNodes[i], d;
      u.nodeName == "IMG" && (d = u.getBoundingClientRect()).right <= e.left && d.bottom > e.top && i++;
    }
    let c;
    To && i && r.nodeType == 1 && (c = r.childNodes[i - 1]).nodeType == 1 && c.contentEditable == "false" && c.getBoundingClientRect().top >= e.top && i--, r == n.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = n.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = AM(n, r, i, e));
  }
  l == null && (l = IM(n, s, e));
  let a = n.docView.nearestDesc(s, !0);
  return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
}
function jh(n) {
  return n.top < n.bottom || n.left < n.right;
}
function hn(n, e) {
  let t = n.getClientRects();
  if (t.length) {
    let r = t[e < 0 ? 0 : t.length - 1];
    if (jh(r))
      return r;
  }
  return Array.prototype.find.call(t, jh) || n.getBoundingClientRect();
}
const RM = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function ug(n, e, t) {
  let { node: r, offset: i, atom: o } = n.docView.domFromPos(e, t < 0 ? -1 : 1), s = To || ft;
  if (r.nodeType == 3)
    if (s && (RM.test(r.nodeValue) || (t < 0 ? !i : i == r.nodeValue.length))) {
      let a = hn(Vt(r, i, i), t);
      if (ft && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let c = hn(Vt(r, i - 1, i - 1), -1);
        if (c.top == a.top) {
          let u = hn(Vt(r, i, i + 1), -1);
          if (u.top != a.top)
            return Ci(u, u.left < c.left);
        }
      }
      return a;
    } else {
      let a = i, c = i, u = t < 0 ? 1 : -1;
      return t < 0 && !i ? (c++, u = -1) : t >= 0 && i == r.nodeValue.length ? (a--, u = 1) : t < 0 ? a-- : c++, Ci(hn(Vt(r, a, c), u), u < 0);
    }
  if (!n.state.doc.resolve(e - (o || 0)).parent.inlineContent) {
    if (o == null && i && (t < 0 || i == dt(r))) {
      let a = r.childNodes[i - 1];
      if (a.nodeType == 1)
        return ca(a.getBoundingClientRect(), !1);
    }
    if (o == null && i < dt(r)) {
      let a = r.childNodes[i];
      if (a.nodeType == 1)
        return ca(a.getBoundingClientRect(), !0);
    }
    return ca(r.getBoundingClientRect(), t >= 0);
  }
  if (o == null && i && (t < 0 || i == dt(r))) {
    let a = r.childNodes[i - 1], c = a.nodeType == 3 ? Vt(a, dt(a) - (s ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
    if (c)
      return Ci(hn(c, 1), !1);
  }
  if (o == null && i < dt(r)) {
    let a = r.childNodes[i];
    for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; )
      a = a.nextSibling;
    let c = a ? a.nodeType == 3 ? Vt(a, 0, s ? 0 : 1) : a.nodeType == 1 ? a : null : null;
    if (c)
      return Ci(hn(c, -1), !0);
  }
  return Ci(hn(r.nodeType == 3 ? Vt(r) : r, -t), t >= 0);
}
function Ci(n, e) {
  if (n.width == 0)
    return n;
  let t = e ? n.left : n.right;
  return { top: n.top, bottom: n.bottom, left: t, right: t };
}
function ca(n, e) {
  if (n.height == 0)
    return n;
  let t = e ? n.top : n.bottom;
  return { top: t, bottom: t, left: n.left, right: n.right };
}
function dg(n, e, t) {
  let r = n.state, i = n.root.activeElement;
  r != e && n.updateState(e), i != n.dom && n.focus();
  try {
    return t();
  } finally {
    r != e && n.updateState(r), i != n.dom && i && i.focus();
  }
}
function DM(n, e, t) {
  let r = e.selection, i = t == "up" ? r.$from : r.$to;
  return dg(n, e, () => {
    let { node: o } = n.docView.domFromPos(i.pos, t == "up" ? -1 : 1);
    for (; ; ) {
      let l = n.docView.nearestDesc(o, !0);
      if (!l)
        break;
      if (l.node.isBlock) {
        o = l.contentDOM || l.dom;
        break;
      }
      o = l.dom.parentNode;
    }
    let s = ug(n, i.pos, 1);
    for (let l = o.firstChild; l; l = l.nextSibling) {
      let a;
      if (l.nodeType == 1)
        a = l.getClientRects();
      else if (l.nodeType == 3)
        a = Vt(l, 0, l.nodeValue.length).getClientRects();
      else
        continue;
      for (let c = 0; c < a.length; c++) {
        let u = a[c];
        if (u.bottom > u.top + 1 && (t == "up" ? s.top - u.top > (u.bottom - s.top) * 2 : u.bottom - s.bottom > (s.bottom - u.top) * 2))
          return !1;
      }
    }
    return !0;
  });
}
const LM = /[\u0590-\u08ac]/;
function PM(n, e, t) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let i = r.parentOffset, o = !i, s = i == r.parent.content.size, l = n.domSelection();
  return l ? !LM.test(r.parent.textContent) || !l.modify ? t == "left" || t == "backward" ? o : s : dg(n, e, () => {
    let { focusNode: a, focusOffset: c, anchorNode: u, anchorOffset: d } = n.domSelectionRange(), h = l.caretBidiLevel;
    l.modify("move", t, "character");
    let f = r.depth ? n.docView.domAfterPos(r.before()) : n.dom, { focusNode: p, focusOffset: m } = n.domSelectionRange(), y = p && !f.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && c == m;
    try {
      l.collapse(u, d), a && (a != u || c != d) && l.extend && l.extend(a, c);
    } catch {
    }
    return h != null && (l.caretBidiLevel = h), y;
  }) : r.pos == r.start() || r.pos == r.end();
}
let Vh = null, Uh = null, Wh = !1;
function BM(n, e, t) {
  return Vh == e && Uh == t ? Wh : (Vh = e, Uh = t, Wh = t == "up" || t == "down" ? DM(n, e, t) : PM(n, e, t));
}
const pt = 0, Kh = 1, Vn = 2, Dt = 3;
class No {
  constructor(e, t, r, i) {
    this.parent = e, this.children = t, this.dom = r, this.contentDOM = i, this.dirty = pt, r.pmViewDesc = this;
  }
  // Used to check whether a given description corresponds to a
  // widget/mark/node.
  matchesWidget(e) {
    return !1;
  }
  matchesMark(e) {
    return !1;
  }
  matchesNode(e, t, r) {
    return !1;
  }
  matchesHack(e) {
    return !1;
  }
  // When parsing in-editor content (in domchange.js), we allow
  // descriptions to determine the parse rules that should be used to
  // parse them.
  parseRule() {
    return null;
  }
  // Used by the editor's event handler to ignore events that come
  // from certain descs.
  stopEvent(e) {
    return !1;
  }
  // The size of the content represented by this desc.
  get size() {
    let e = 0;
    for (let t = 0; t < this.children.length; t++)
      e += this.children[t].size;
    return e;
  }
  // For block nodes, this represents the space taken up by their
  // start/end tokens.
  get border() {
    return 0;
  }
  destroy() {
    this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
    for (let e = 0; e < this.children.length; e++)
      this.children[e].destroy();
  }
  posBeforeChild(e) {
    for (let t = 0, r = this.posAtStart; ; t++) {
      let i = this.children[t];
      if (i == e)
        return r;
      r += i.size;
    }
  }
  get posBefore() {
    return this.parent.posBeforeChild(this);
  }
  get posAtStart() {
    return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
  }
  get posAfter() {
    return this.posBefore + this.size;
  }
  get posAtEnd() {
    return this.posAtStart + this.size - 2 * this.border;
  }
  localPosFromDOM(e, t, r) {
    if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode))
      if (r < 0) {
        let o, s;
        if (e == this.contentDOM)
          o = e.childNodes[t - 1];
        else {
          for (; e.parentNode != this.contentDOM; )
            e = e.parentNode;
          o = e.previousSibling;
        }
        for (; o && !((s = o.pmViewDesc) && s.parent == this); )
          o = o.previousSibling;
        return o ? this.posBeforeChild(s) + s.size : this.posAtStart;
      } else {
        let o, s;
        if (e == this.contentDOM)
          o = e.childNodes[t];
        else {
          for (; e.parentNode != this.contentDOM; )
            e = e.parentNode;
          o = e.nextSibling;
        }
        for (; o && !((s = o.pmViewDesc) && s.parent == this); )
          o = o.nextSibling;
        return o ? this.posBeforeChild(s) : this.posAtEnd;
      }
    let i;
    if (e == this.dom && this.contentDOM)
      i = t > Ne(this.contentDOM);
    else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM))
      i = e.compareDocumentPosition(this.contentDOM) & 2;
    else if (this.dom.firstChild) {
      if (t == 0)
        for (let o = e; ; o = o.parentNode) {
          if (o == this.dom) {
            i = !1;
            break;
          }
          if (o.previousSibling)
            break;
        }
      if (i == null && t == e.childNodes.length)
        for (let o = e; ; o = o.parentNode) {
          if (o == this.dom) {
            i = !0;
            break;
          }
          if (o.nextSibling)
            break;
        }
    }
    return i ?? r > 0 ? this.posAtEnd : this.posAtStart;
  }
  nearestDesc(e, t = !1) {
    for (let r = !0, i = e; i; i = i.parentNode) {
      let o = this.getDesc(i), s;
      if (o && (!t || o.node))
        if (r && (s = o.nodeDOM) && !(s.nodeType == 1 ? s.contains(e.nodeType == 1 ? e : e.parentNode) : s == e))
          r = !1;
        else
          return o;
    }
  }
  getDesc(e) {
    let t = e.pmViewDesc;
    for (let r = t; r; r = r.parent)
      if (r == this)
        return t;
  }
  posFromDOM(e, t, r) {
    for (let i = e; i; i = i.parentNode) {
      let o = this.getDesc(i);
      if (o)
        return o.localPosFromDOM(e, t, r);
    }
    return -1;
  }
  // Find the desc for the node after the given pos, if any. (When a
  // parent node overrode rendering, there might not be one.)
  descAt(e) {
    for (let t = 0, r = 0; t < this.children.length; t++) {
      let i = this.children[t], o = r + i.size;
      if (r == e && o != r) {
        for (; !i.border && i.children.length; )
          for (let s = 0; s < i.children.length; s++) {
            let l = i.children[s];
            if (l.size) {
              i = l;
              break;
            }
          }
        return i;
      }
      if (e < o)
        return i.descAt(e - r - i.border);
      r = o;
    }
  }
  domFromPos(e, t) {
    if (!this.contentDOM)
      return { node: this.dom, offset: 0, atom: e + 1 };
    let r = 0, i = 0;
    for (let o = 0; r < this.children.length; r++) {
      let s = this.children[r], l = o + s.size;
      if (l > e || s instanceof fg) {
        i = e - o;
        break;
      }
      o = l;
    }
    if (i)
      return this.children[r].domFromPos(i - this.children[r].border, t);
    for (let o; r && !(o = this.children[r - 1]).size && o instanceof hg && o.side >= 0; r--)
      ;
    if (t <= 0) {
      let o, s = !0;
      for (; o = r ? this.children[r - 1] : null, !(!o || o.dom.parentNode == this.contentDOM); r--, s = !1)
        ;
      return o && t && s && !o.border && !o.domAtom ? o.domFromPos(o.size, t) : { node: this.contentDOM, offset: o ? Ne(o.dom) + 1 : 0 };
    } else {
      let o, s = !0;
      for (; o = r < this.children.length ? this.children[r] : null, !(!o || o.dom.parentNode == this.contentDOM); r++, s = !1)
        ;
      return o && s && !o.border && !o.domAtom ? o.domFromPos(0, t) : { node: this.contentDOM, offset: o ? Ne(o.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(e, t, r = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from: e, to: t, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let i = -1, o = -1;
    for (let s = r, l = 0; ; l++) {
      let a = this.children[l], c = s + a.size;
      if (i == -1 && e <= c) {
        let u = s + a.border;
        if (e >= u && t <= c - a.border && a.node && a.contentDOM && this.contentDOM.contains(a.contentDOM))
          return a.parseRange(e, t, u);
        e = s;
        for (let d = l; d > 0; d--) {
          let h = this.children[d - 1];
          if (h.size && h.dom.parentNode == this.contentDOM && !h.emptyChildAt(1)) {
            i = Ne(h.dom) + 1;
            break;
          }
          e -= h.size;
        }
        i == -1 && (i = 0);
      }
      if (i > -1 && (c > t || l == this.children.length - 1)) {
        t = c;
        for (let u = l + 1; u < this.children.length; u++) {
          let d = this.children[u];
          if (d.size && d.dom.parentNode == this.contentDOM && !d.emptyChildAt(-1)) {
            o = Ne(d.dom);
            break;
          }
          t += d.size;
        }
        o == -1 && (o = this.contentDOM.childNodes.length);
        break;
      }
      s = c;
    }
    return { node: this.contentDOM, from: e, to: t, fromOffset: i, toOffset: o };
  }
  emptyChildAt(e) {
    if (this.border || !this.contentDOM || !this.children.length)
      return !1;
    let t = this.children[e < 0 ? 0 : this.children.length - 1];
    return t.size == 0 || t.emptyChildAt(e);
  }
  domAfterPos(e) {
    let { node: t, offset: r } = this.domFromPos(e, 0);
    if (t.nodeType != 1 || r == t.childNodes.length)
      throw new RangeError("No node after pos " + e);
    return t.childNodes[r];
  }
  // View descs are responsible for setting any selection that falls
  // entirely inside of them, so that custom implementations can do
  // custom things with the selection. Note that this falls apart when
  // a selection starts in such a node and ends in another, in which
  // case we just use whatever domFromPos produces as a best effort.
  setSelection(e, t, r, i = !1) {
    let o = Math.min(e, t), s = Math.max(e, t);
    for (let f = 0, p = 0; f < this.children.length; f++) {
      let m = this.children[f], y = p + m.size;
      if (o > p && s < y)
        return m.setSelection(e - p - m.border, t - p - m.border, r, i);
      p = y;
    }
    let l = this.domFromPos(e, e ? -1 : 1), a = t == e ? l : this.domFromPos(t, t ? -1 : 1), c = r.root.getSelection(), u = r.domSelectionRange(), d = !1;
    if ((ft || Be) && e == t) {
      let { node: f, offset: p } = l;
      if (f.nodeType == 3) {
        if (d = !!(p && f.nodeValue[p - 1] == `
`), d && p == f.nodeValue.length)
          for (let m = f, y; m; m = m.parentNode) {
            if (y = m.nextSibling) {
              y.nodeName == "BR" && (l = a = { node: y.parentNode, offset: Ne(y) + 1 });
              break;
            }
            let g = m.pmViewDesc;
            if (g && g.node && g.node.isBlock)
              break;
          }
      } else {
        let m = f.childNodes[p - 1];
        d = m && (m.nodeName == "BR" || m.contentEditable == "false");
      }
    }
    if (ft && u.focusNode && u.focusNode != a.node && u.focusNode.nodeType == 1) {
      let f = u.focusNode.childNodes[u.focusOffset];
      f && f.contentEditable == "false" && (i = !0);
    }
    if (!(i || d && Be) && cr(l.node, l.offset, u.anchorNode, u.anchorOffset) && cr(a.node, a.offset, u.focusNode, u.focusOffset))
      return;
    let h = !1;
    if ((c.extend || e == t) && !(d && ft)) {
      c.collapse(l.node, l.offset);
      try {
        e != t && c.extend(a.node, a.offset), h = !0;
      } catch {
      }
    }
    if (!h) {
      if (e > t) {
        let p = l;
        l = a, a = p;
      }
      let f = document.createRange();
      f.setEnd(a.node, a.offset), f.setStart(l.node, l.offset), c.removeAllRanges(), c.addRange(f);
    }
  }
  ignoreMutation(e) {
    return !this.contentDOM && e.type != "selection";
  }
  get contentLost() {
    return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
  }
  // Remove a subtree of the element tree that has been touched
  // by a DOM change, so that the next update will redraw it.
  markDirty(e, t) {
    for (let r = 0, i = 0; i < this.children.length; i++) {
      let o = this.children[i], s = r + o.size;
      if (r == s ? e <= s && t >= r : e < s && t > r) {
        let l = r + o.border, a = s - o.border;
        if (e >= l && t <= a) {
          this.dirty = e == r || t == s ? Vn : Kh, e == l && t == a && (o.contentLost || o.dom.parentNode != this.contentDOM) ? o.dirty = Dt : o.markDirty(e - l, t - l);
          return;
        } else
          o.dirty = o.dom == o.contentDOM && o.dom.parentNode == this.contentDOM && !o.children.length ? Vn : Dt;
      }
      r = s;
    }
    this.dirty = Vn;
  }
  markParentsDirty() {
    let e = 1;
    for (let t = this.parent; t; t = t.parent, e++) {
      let r = e == 1 ? Vn : Kh;
      t.dirty < r && (t.dirty = r);
    }
  }
  get domAtom() {
    return !1;
  }
  get ignoreForCoords() {
    return !1;
  }
  get ignoreForSelection() {
    return !1;
  }
  isText(e) {
    return !1;
  }
}
class hg extends No {
  constructor(e, t, r, i) {
    let o, s = t.type.toDOM;
    if (typeof s == "function" && (s = s(r, () => {
      if (!o)
        return i;
      if (o.parent)
        return o.parent.posBeforeChild(o);
    })), !t.type.spec.raw) {
      if (s.nodeType != 1) {
        let l = document.createElement("span");
        l.appendChild(s), s = l;
      }
      s.contentEditable = "false", s.classList.add("ProseMirror-widget");
    }
    super(e, [], s, null), this.widget = t, this.widget = t, o = this;
  }
  matchesWidget(e) {
    return this.dirty == pt && e.type.eq(this.widget.type);
  }
  parseRule() {
    return { ignore: !0 };
  }
  stopEvent(e) {
    let t = this.widget.spec.stopEvent;
    return t ? t(e) : !1;
  }
  ignoreMutation(e) {
    return e.type != "selection" || this.widget.spec.ignoreSelection;
  }
  destroy() {
    this.widget.type.destroy(this.dom), super.destroy();
  }
  get domAtom() {
    return !0;
  }
  get ignoreForSelection() {
    return !!this.widget.type.spec.relaxedSide;
  }
  get side() {
    return this.widget.type.side;
  }
}
class $M extends No {
  constructor(e, t, r, i) {
    super(e, [], t, null), this.textDOM = r, this.text = i;
  }
  get size() {
    return this.text.length;
  }
  localPosFromDOM(e, t) {
    return e != this.textDOM ? this.posAtStart + (t ? this.size : 0) : this.posAtStart + t;
  }
  domFromPos(e) {
    return { node: this.textDOM, offset: e };
  }
  ignoreMutation(e) {
    return e.type === "characterData" && e.target.nodeValue == e.oldValue;
  }
}
class ur extends No {
  constructor(e, t, r, i, o) {
    super(e, [], r, i), this.mark = t, this.spec = o;
  }
  static create(e, t, r, i) {
    let o = i.nodeViews[t.type.name], s = o && o(t, i, r);
    return (!s || !s.dom) && (s = si.renderSpec(document, t.type.spec.toDOM(t, r), null, t.attrs)), new ur(e, t, s.dom, s.contentDOM || s.dom, s);
  }
  parseRule() {
    return this.dirty & Dt || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != Dt && this.mark.eq(e);
  }
  markDirty(e, t) {
    if (super.markDirty(e, t), this.dirty != pt) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = pt;
    }
  }
  slice(e, t, r) {
    let i = ur.create(this.parent, this.mark, !0, r), o = this.children, s = this.size;
    t < s && (o = hc(o, t, s, r)), e > 0 && (o = hc(o, 0, e, r));
    for (let l = 0; l < o.length; l++)
      o[l].parent = i;
    return i.children = o, i;
  }
  ignoreMutation(e) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
  }
  destroy() {
    this.spec.destroy && this.spec.destroy(), super.destroy();
  }
}
class En extends No {
  constructor(e, t, r, i, o, s, l, a, c) {
    super(e, [], o, s), this.node = t, this.outerDeco = r, this.innerDeco = i, this.nodeDOM = l;
  }
  // By default, a node is rendered using the `toDOM` method from the
  // node type spec. But client code can use the `nodeViews` spec to
  // supply a custom node view, which can influence various aspects of
  // the way the node works.
  //
  // (Using subclassing for this was intentionally decided against,
  // since it'd require exposing a whole slew of finicky
  // implementation details to the user code that they probably will
  // never need.)
  static create(e, t, r, i, o, s) {
    let l = o.nodeViews[t.type.name], a, c = l && l(t, o, () => {
      if (!a)
        return s;
      if (a.parent)
        return a.parent.posBeforeChild(a);
    }, r, i), u = c && c.dom, d = c && c.contentDOM;
    if (t.isText) {
      if (!u)
        u = document.createTextNode(t.text);
      else if (u.nodeType != 3)
        throw new RangeError("Text must be rendered as a DOM text node");
    } else u || ({ dom: u, contentDOM: d } = si.renderSpec(document, t.type.spec.toDOM(t), null, t.attrs));
    !d && !t.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), t.type.spec.draggable && (u.draggable = !0));
    let h = u;
    return u = gg(u, r, t), c ? a = new zM(e, t, r, i, u, d || null, h, c, o, s + 1) : t.isText ? new ml(e, t, r, i, u, h, o) : new En(e, t, r, i, u, d || null, h, o, s + 1);
  }
  parseRule() {
    if (this.node.type.spec.reparseInView)
      return null;
    let e = { node: this.node.type.name, attrs: this.node.attrs };
    if (this.node.type.whitespace == "pre" && (e.preserveWhitespace = "full"), !this.contentDOM)
      e.getContent = () => this.node.content;
    else if (!this.contentLost)
      e.contentElement = this.contentDOM;
    else {
      for (let t = this.children.length - 1; t >= 0; t--) {
        let r = this.children[t];
        if (this.dom.contains(r.dom.parentNode)) {
          e.contentElement = r.dom.parentNode;
          break;
        }
      }
      e.contentElement || (e.getContent = () => N.empty);
    }
    return e;
  }
  matchesNode(e, t, r) {
    return this.dirty == pt && e.eq(this.node) && js(t, this.outerDeco) && r.eq(this.innerDeco);
  }
  get size() {
    return this.node.nodeSize;
  }
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  // Syncs `this.children` to match `this.node.content` and the local
  // decorations, possibly introducing nesting for marks. Then, in a
  // separate step, syncs the DOM inside `this.contentDOM` to
  // `this.children`.
  updateChildren(e, t) {
    let r = this.node.inlineContent, i = t, o = e.composing ? this.localCompositionInfo(e, t) : null, s = o && o.pos > -1 ? o : null, l = o && o.pos < 0, a = new _M(this, s && s.node, e);
    jM(this.node, this.innerDeco, (c, u, d) => {
      c.spec.marks ? a.syncToMarks(c.spec.marks, r, e) : c.type.side >= 0 && !d && a.syncToMarks(u == this.node.childCount ? ee.none : this.node.child(u).marks, r, e), a.placeWidget(c, e, i);
    }, (c, u, d, h) => {
      a.syncToMarks(c.marks, r, e);
      let f;
      a.findNodeMatch(c, u, d, h) || l && e.state.selection.from > i && e.state.selection.to < i + c.nodeSize && (f = a.findIndexWithChild(o.node)) > -1 && a.updateNodeAt(c, u, d, f, e) || a.updateNextNode(c, u, d, e, h, i) || a.addNode(c, u, d, e, i), i += c.nodeSize;
    }), a.syncToMarks([], r, e), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == Vn) && (s && this.protectLocalComposition(e, s), pg(this.contentDOM, this.children, e), ni && VM(this.dom));
  }
  localCompositionInfo(e, t) {
    let { from: r, to: i } = e.state.selection;
    if (!(e.state.selection instanceof J) || r < t || i > t + this.node.content.size)
      return null;
    let o = e.input.compositionNode;
    if (!o || !this.dom.contains(o.parentNode))
      return null;
    if (this.node.inlineContent) {
      let s = o.nodeValue, l = UM(this.node.content, s, r - t, i - t);
      return l < 0 ? null : { node: o, pos: l, text: s };
    } else
      return { node: o, pos: -1, text: "" };
  }
  protectLocalComposition(e, { node: t, pos: r, text: i }) {
    if (this.getDesc(t))
      return;
    let o = t;
    for (; o.parentNode != this.contentDOM; o = o.parentNode) {
      for (; o.previousSibling; )
        o.parentNode.removeChild(o.previousSibling);
      for (; o.nextSibling; )
        o.parentNode.removeChild(o.nextSibling);
      o.pmViewDesc && (o.pmViewDesc = void 0);
    }
    let s = new $M(this, o, t, i);
    e.input.compositionNodes.push(s), this.children = hc(this.children, r, r + i.length, e, s);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, t, r, i) {
    return this.dirty == Dt || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, t, r, i), !0);
  }
  updateInner(e, t, r, i) {
    this.updateOuterDeco(t), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = pt;
  }
  updateOuterDeco(e) {
    if (js(e, this.outerDeco))
      return;
    let t = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = mg(this.dom, this.nodeDOM, dc(this.outerDeco, this.node, t), dc(e, this.node, t)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
  }
  // Mark this node as being the selected node.
  selectNode() {
    this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = !0));
  }
  // Remove selected node marking from this node.
  deselectNode() {
    this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
  }
  get domAtom() {
    return this.node.isAtom;
  }
}
function Jh(n, e, t, r, i) {
  gg(r, e, n);
  let o = new En(void 0, n, e, t, r, r, r, i, 0);
  return o.contentDOM && o.updateChildren(i, 0), o;
}
class ml extends En {
  constructor(e, t, r, i, o, s, l) {
    super(e, t, r, i, o, null, s, l, 0);
  }
  parseRule() {
    let e = this.nodeDOM.parentNode;
    for (; e && e != this.dom && !e.pmIsDeco; )
      e = e.parentNode;
    return { skip: e || !0 };
  }
  update(e, t, r, i) {
    return this.dirty == Dt || this.dirty != pt && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(t), (this.dirty != pt || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = pt, !0);
  }
  inParent() {
    let e = this.parent.contentDOM;
    for (let t = this.nodeDOM; t; t = t.parentNode)
      if (t == e)
        return !0;
    return !1;
  }
  domFromPos(e) {
    return { node: this.nodeDOM, offset: e };
  }
  localPosFromDOM(e, t, r) {
    return e == this.nodeDOM ? this.posAtStart + Math.min(t, this.node.text.length) : super.localPosFromDOM(e, t, r);
  }
  ignoreMutation(e) {
    return e.type != "characterData" && e.type != "selection";
  }
  slice(e, t, r) {
    let i = this.node.cut(e, t), o = document.createTextNode(i.text);
    return new ml(this.parent, i, this.outerDeco, this.innerDeco, o, o, r);
  }
  markDirty(e, t) {
    super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = Dt);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class fg extends No {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == pt && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class zM extends En {
  constructor(e, t, r, i, o, s, l, a, c, u) {
    super(e, t, r, i, o, s, l, c, u), this.spec = a;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, t, r, i) {
    if (this.dirty == Dt)
      return !1;
    if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
      let o = this.spec.update(e, t, r);
      return o && this.updateInner(e, t, r, i), o;
    } else return !this.contentDOM && !e.isLeaf ? !1 : super.update(e, t, r, i);
  }
  selectNode() {
    this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
  }
  deselectNode() {
    this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
  }
  setSelection(e, t, r, i) {
    this.spec.setSelection ? this.spec.setSelection(e, t, r.root) : super.setSelection(e, t, r, i);
  }
  destroy() {
    this.spec.destroy && this.spec.destroy(), super.destroy();
  }
  stopEvent(e) {
    return this.spec.stopEvent ? this.spec.stopEvent(e) : !1;
  }
  ignoreMutation(e) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
  }
}
function pg(n, e, t) {
  let r = n.firstChild, i = !1;
  for (let o = 0; o < e.length; o++) {
    let s = e[o], l = s.dom;
    if (l.parentNode == n) {
      for (; l != r; )
        r = Gh(r), i = !0;
      r = r.nextSibling;
    } else
      i = !0, n.insertBefore(l, r);
    if (s instanceof ur) {
      let a = r ? r.previousSibling : n.lastChild;
      pg(s.contentDOM, s.children, t), r = a ? a.nextSibling : n.firstChild;
    }
  }
  for (; r; )
    r = Gh(r), i = !0;
  i && t.trackWrites == n && (t.trackWrites = null);
}
const qi = function(n) {
  n && (this.nodeName = n);
};
qi.prototype = /* @__PURE__ */ Object.create(null);
const Un = [new qi()];
function dc(n, e, t) {
  if (n.length == 0)
    return Un;
  let r = t ? Un[0] : new qi(), i = [r];
  for (let o = 0; o < n.length; o++) {
    let s = n[o].type.attrs;
    if (s) {
      s.nodeName && i.push(r = new qi(s.nodeName));
      for (let l in s) {
        let a = s[l];
        a != null && (t && i.length == 1 && i.push(r = new qi(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
      }
    }
  }
  return i;
}
function mg(n, e, t, r) {
  if (t == Un && r == Un)
    return e;
  let i = e;
  for (let o = 0; o < r.length; o++) {
    let s = r[o], l = t[o];
    if (o) {
      let a;
      l && l.nodeName == s.nodeName && i != n && (a = i.parentNode) && a.nodeName.toLowerCase() == s.nodeName || (a = document.createElement(s.nodeName), a.pmIsDeco = !0, a.appendChild(i), l = Un[0]), i = a;
    }
    FM(i, l || Un[0], s);
  }
  return i;
}
function FM(n, e, t) {
  for (let r in e)
    r != "class" && r != "style" && r != "nodeName" && !(r in t) && n.removeAttribute(r);
  for (let r in t)
    r != "class" && r != "style" && r != "nodeName" && t[r] != e[r] && n.setAttribute(r, t[r]);
  if (e.class != t.class) {
    let r = e.class ? e.class.split(" ").filter(Boolean) : [], i = t.class ? t.class.split(" ").filter(Boolean) : [];
    for (let o = 0; o < r.length; o++)
      i.indexOf(r[o]) == -1 && n.classList.remove(r[o]);
    for (let o = 0; o < i.length; o++)
      r.indexOf(i[o]) == -1 && n.classList.add(i[o]);
    n.classList.length == 0 && n.removeAttribute("class");
  }
  if (e.style != t.style) {
    if (e.style) {
      let r = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, i;
      for (; i = r.exec(e.style); )
        n.style.removeProperty(i[1]);
    }
    t.style && (n.style.cssText += t.style);
  }
}
function gg(n, e, t) {
  return mg(n, n, Un, dc(e, t, n.nodeType != 1));
}
function js(n, e) {
  if (n.length != e.length)
    return !1;
  for (let t = 0; t < n.length; t++)
    if (!n[t].type.eq(e[t].type))
      return !1;
  return !0;
}
function Gh(n) {
  let e = n.nextSibling;
  return n.parentNode.removeChild(n), e;
}
class _M {
  constructor(e, t, r) {
    this.lock = t, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = HM(e.node.content, e);
  }
  // Destroy and remove the children between the given indices in
  // `this.top`.
  destroyBetween(e, t) {
    if (e != t) {
      for (let r = e; r < t; r++)
        this.top.children[r].destroy();
      this.top.children.splice(e, t - e), this.changed = !0;
    }
  }
  // Destroy all remaining children in `this.top`.
  destroyRest() {
    this.destroyBetween(this.index, this.top.children.length);
  }
  // Sync the current stack of mark descs with the given array of
  // marks, reusing existing mark descs when possible.
  syncToMarks(e, t, r) {
    let i = 0, o = this.stack.length >> 1, s = Math.min(o, e.length);
    for (; i < s && (i == o - 1 ? this.top : this.stack[i + 1 << 1]).matchesMark(e[i]) && e[i].type.spec.spanning !== !1; )
      i++;
    for (; i < o; )
      this.destroyRest(), this.top.dirty = pt, this.index = this.stack.pop(), this.top = this.stack.pop(), o--;
    for (; o < e.length; ) {
      this.stack.push(this.top, this.index + 1);
      let l = -1;
      for (let a = this.index; a < Math.min(this.index + 3, this.top.children.length); a++) {
        let c = this.top.children[a];
        if (c.matchesMark(e[o]) && !this.isLocked(c.dom)) {
          l = a;
          break;
        }
      }
      if (l > -1)
        l > this.index && (this.changed = !0, this.destroyBetween(this.index, l)), this.top = this.top.children[this.index];
      else {
        let a = ur.create(this.top, e[o], t, r);
        this.top.children.splice(this.index, 0, a), this.top = a, this.changed = !0;
      }
      this.index = 0, o++;
    }
  }
  // Try to find a node desc matching the given data. Skip over it and
  // return true when successful.
  findNodeMatch(e, t, r, i) {
    let o = -1, s;
    if (i >= this.preMatch.index && (s = this.preMatch.matches[i - this.preMatch.index]).parent == this.top && s.matchesNode(e, t, r))
      o = this.top.children.indexOf(s, this.index);
    else
      for (let l = this.index, a = Math.min(this.top.children.length, l + 5); l < a; l++) {
        let c = this.top.children[l];
        if (c.matchesNode(e, t, r) && !this.preMatch.matched.has(c)) {
          o = l;
          break;
        }
      }
    return o < 0 ? !1 : (this.destroyBetween(this.index, o), this.index++, !0);
  }
  updateNodeAt(e, t, r, i, o) {
    let s = this.top.children[i];
    return s.dirty == Dt && s.dom == s.contentDOM && (s.dirty = Vn), s.update(e, t, r, o) ? (this.destroyBetween(this.index, i), this.index++, !0) : !1;
  }
  findIndexWithChild(e) {
    for (; ; ) {
      let t = e.parentNode;
      if (!t)
        return -1;
      if (t == this.top.contentDOM) {
        let r = e.pmViewDesc;
        if (r) {
          for (let i = this.index; i < this.top.children.length; i++)
            if (this.top.children[i] == r)
              return i;
        }
        return -1;
      }
      e = t;
    }
  }
  // Try to update the next node, if any, to the given data. Checks
  // pre-matches to avoid overwriting nodes that could still be used.
  updateNextNode(e, t, r, i, o, s) {
    for (let l = this.index; l < this.top.children.length; l++) {
      let a = this.top.children[l];
      if (a instanceof En) {
        let c = this.preMatch.matched.get(a);
        if (c != null && c != o)
          return !1;
        let u = a.dom, d, h = this.isLocked(u) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != Dt && js(t, a.outerDeco));
        if (!h && a.update(e, t, r, i))
          return this.destroyBetween(this.index, l), a.dom != u && (this.changed = !0), this.index++, !0;
        if (!h && (d = this.recreateWrapper(a, e, t, r, i, s)))
          return this.destroyBetween(this.index, l), this.top.children[this.index] = d, d.contentDOM && (d.dirty = Vn, d.updateChildren(i, s + 1), d.dirty = pt), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, t, r, i, o, s) {
    if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !js(r, e.outerDeco) || !i.eq(e.innerDeco))
      return null;
    let l = En.create(this.top, t, r, i, o, s);
    if (l.contentDOM) {
      l.children = e.children, e.children = [];
      for (let a of l.children)
        a.parent = l;
    }
    return e.destroy(), l;
  }
  // Insert the node as a newly created node desc.
  addNode(e, t, r, i, o) {
    let s = En.create(this.top, e, t, r, i, o);
    s.contentDOM && s.updateChildren(i, o + 1), this.top.children.splice(this.index++, 0, s), this.changed = !0;
  }
  placeWidget(e, t, r) {
    let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let o = new hg(this.top, e, t, r);
      this.top.children.splice(this.index++, 0, o), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], t = this.top;
    for (; e instanceof ur; )
      t = e, e = t.children[t.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof ml) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((Be || Re) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
  }
  addHackNode(e, t) {
    if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let i = new fg(this.top, [], r, null);
      t != this.top ? t.children.push(i) : t.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function HM(n, e) {
  let t = e, r = t.children.length, i = n.childCount, o = /* @__PURE__ */ new Map(), s = [];
  e: for (; i > 0; ) {
    let l;
    for (; ; )
      if (r) {
        let c = t.children[r - 1];
        if (c instanceof ur)
          t = c, r = c.children.length;
        else {
          l = c, r--;
          break;
        }
      } else {
        if (t == e)
          break e;
        r = t.parent.children.indexOf(t), t = t.parent;
      }
    let a = l.node;
    if (a) {
      if (a != n.child(i - 1))
        break;
      --i, o.set(l, i), s.push(l);
    }
  }
  return { index: i, matched: o, matches: s.reverse() };
}
function qM(n, e) {
  return n.type.side - e.type.side;
}
function jM(n, e, t, r) {
  let i = e.locals(n), o = 0;
  if (i.length == 0) {
    for (let c = 0; c < n.childCount; c++) {
      let u = n.child(c);
      r(u, i, e.forChild(o, u), c), o += u.nodeSize;
    }
    return;
  }
  let s = 0, l = [], a = null;
  for (let c = 0; ; ) {
    let u, d;
    for (; s < i.length && i[s].to == o; ) {
      let y = i[s++];
      y.widget && (u ? (d || (d = [u])).push(y) : u = y);
    }
    if (u)
      if (d) {
        d.sort(qM);
        for (let y = 0; y < d.length; y++)
          t(d[y], c, !!a);
      } else
        t(u, c, !!a);
    let h, f;
    if (a)
      f = -1, h = a, a = null;
    else if (c < n.childCount)
      f = c, h = n.child(c++);
    else
      break;
    for (let y = 0; y < l.length; y++)
      l[y].to <= o && l.splice(y--, 1);
    for (; s < i.length && i[s].from <= o && i[s].to > o; )
      l.push(i[s++]);
    let p = o + h.nodeSize;
    if (h.isText) {
      let y = p;
      s < i.length && i[s].from < y && (y = i[s].from);
      for (let g = 0; g < l.length; g++)
        l[g].to < y && (y = l[g].to);
      y < p && (a = h.cut(y - o), h = h.cut(0, y - o), p = y, f = -1);
    } else
      for (; s < i.length && i[s].to < p; )
        s++;
    let m = h.isInline && !h.isLeaf ? l.filter((y) => !y.inline) : l.slice();
    r(h, m, e.forChild(o, h), f), o = p;
  }
}
function VM(n) {
  if (n.nodeName == "UL" || n.nodeName == "OL") {
    let e = n.style.cssText;
    n.style.cssText = e + "; list-style: square !important", window.getComputedStyle(n).listStyle, n.style.cssText = e;
  }
}
function UM(n, e, t, r) {
  for (let i = 0, o = 0; i < n.childCount && o <= r; ) {
    let s = n.child(i++), l = o;
    if (o += s.nodeSize, !s.isText)
      continue;
    let a = s.text;
    for (; i < n.childCount; ) {
      let c = n.child(i++);
      if (o += c.nodeSize, !c.isText)
        break;
      a += c.text;
    }
    if (o >= t) {
      if (o >= r && a.slice(r - e.length - l, r - l) == e)
        return r - e.length;
      let c = l < r ? a.lastIndexOf(e, r - l - 1) : -1;
      if (c >= 0 && c + e.length + l >= t)
        return l + c;
      if (t == r && a.length >= r + e.length - l && a.slice(r - l, r - l + e.length) == e)
        return r;
    }
  }
  return -1;
}
function hc(n, e, t, r, i) {
  let o = [];
  for (let s = 0, l = 0; s < n.length; s++) {
    let a = n[s], c = l, u = l += a.size;
    c >= t || u <= e ? o.push(a) : (c < e && o.push(a.slice(0, e - c, r)), i && (o.push(i), i = void 0), u > t && o.push(a.slice(t - c, a.size, r)));
  }
  return o;
}
function su(n, e = null) {
  let t = n.domSelectionRange(), r = n.state.doc;
  if (!t.focusNode)
    return null;
  let i = n.docView.nearestDesc(t.focusNode), o = i && i.size == 0, s = n.docView.posFromDOM(t.focusNode, t.focusOffset, 1);
  if (s < 0)
    return null;
  let l = r.resolve(s), a, c;
  if (pl(t)) {
    for (a = s; i && !i.node; )
      i = i.parent;
    let d = i.node;
    if (i && d.isAtom && q.isSelectable(d) && i.parent && !(d.isInline && yM(t.focusNode, t.focusOffset, i.dom))) {
      let h = i.posBefore;
      c = new q(s == h ? l : r.resolve(h));
    }
  } else {
    if (t instanceof n.dom.ownerDocument.defaultView.Selection && t.rangeCount > 1) {
      let d = s, h = s;
      for (let f = 0; f < t.rangeCount; f++) {
        let p = t.getRangeAt(f);
        d = Math.min(d, n.docView.posFromDOM(p.startContainer, p.startOffset, 1)), h = Math.max(h, n.docView.posFromDOM(p.endContainer, p.endOffset, -1));
      }
      if (d < 0)
        return null;
      [a, s] = h == n.state.selection.anchor ? [h, d] : [d, h], l = r.resolve(s);
    } else
      a = n.docView.posFromDOM(t.anchorNode, t.anchorOffset, 1);
    if (a < 0)
      return null;
  }
  let u = r.resolve(a);
  if (!c) {
    let d = e == "pointer" || n.state.selection.head < l.pos && !o ? 1 : -1;
    c = lu(n, u, l, d);
  }
  return c;
}
function yg(n) {
  return n.editable ? n.hasFocus() : kg(n) && document.activeElement && document.activeElement.contains(n.dom);
}
function tn(n, e = !1) {
  let t = n.state.selection;
  if (bg(n, t), !!yg(n)) {
    if (!e && n.input.mouseDown && n.input.mouseDown.allowDefault && Re) {
      let r = n.domSelectionRange(), i = n.domObserver.currentSelection;
      if (r.anchorNode && i.anchorNode && cr(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
        n.input.mouseDown.delayedSelectionSync = !0, n.domObserver.setCurSelection();
        return;
      }
    }
    if (n.domObserver.disconnectSelection(), n.cursorWrapper)
      KM(n);
    else {
      let { anchor: r, head: i } = t, o, s;
      Yh && !(t instanceof J) && (t.$from.parent.inlineContent || (o = Xh(n, t.from)), !t.empty && !t.$from.parent.inlineContent && (s = Xh(n, t.to))), n.docView.setSelection(r, i, n, e), Yh && (o && Qh(o), s && Qh(s)), t.visible ? n.dom.classList.remove("ProseMirror-hideselection") : (n.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && WM(n));
    }
    n.domObserver.setCurSelection(), n.domObserver.connectSelection();
  }
}
const Yh = Be || Re && og < 63;
function Xh(n, e) {
  let { node: t, offset: r } = n.docView.domFromPos(e, 0), i = r < t.childNodes.length ? t.childNodes[r] : null, o = r ? t.childNodes[r - 1] : null;
  if (Be && i && i.contentEditable == "false")
    return ua(i);
  if ((!i || i.contentEditable == "false") && (!o || o.contentEditable == "false")) {
    if (i)
      return ua(i);
    if (o)
      return ua(o);
  }
}
function ua(n) {
  return n.contentEditable = "true", Be && n.draggable && (n.draggable = !1, n.wasDraggable = !0), n;
}
function Qh(n) {
  n.contentEditable = "false", n.wasDraggable && (n.draggable = !0, n.wasDraggable = null);
}
function WM(n) {
  let e = n.dom.ownerDocument;
  e.removeEventListener("selectionchange", n.input.hideSelectionGuard);
  let t = n.domSelectionRange(), r = t.anchorNode, i = t.anchorOffset;
  e.addEventListener("selectionchange", n.input.hideSelectionGuard = () => {
    (t.anchorNode != r || t.anchorOffset != i) && (e.removeEventListener("selectionchange", n.input.hideSelectionGuard), setTimeout(() => {
      (!yg(n) || n.state.selection.visible) && n.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function KM(n) {
  let e = n.domSelection();
  if (!e)
    return;
  let t = n.cursorWrapper.dom, r = t.nodeName == "IMG";
  r ? e.collapse(t.parentNode, Ne(t) + 1) : e.collapse(t, 0), !r && !n.state.selection.visible && Ve && vn <= 11 && (t.disabled = !0, t.disabled = !1);
}
function bg(n, e) {
  if (e instanceof q) {
    let t = n.docView.descAt(e.from);
    t != n.lastSelectedViewDesc && (Zh(n), t && t.selectNode(), n.lastSelectedViewDesc = t);
  } else
    Zh(n);
}
function Zh(n) {
  n.lastSelectedViewDesc && (n.lastSelectedViewDesc.parent && n.lastSelectedViewDesc.deselectNode(), n.lastSelectedViewDesc = void 0);
}
function lu(n, e, t, r) {
  return n.someProp("createSelectionBetween", (i) => i(n, e, t)) || J.between(e, t, r);
}
function ef(n) {
  return n.editable && !n.hasFocus() ? !1 : kg(n);
}
function kg(n) {
  let e = n.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return n.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (n.editable || n.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function JM(n) {
  let e = n.docView.domFromPos(n.state.selection.anchor, 0), t = n.domSelectionRange();
  return cr(e.node, e.offset, t.anchorNode, t.anchorOffset);
}
function fc(n, e) {
  let { $anchor: t, $head: r } = n.selection, i = e > 0 ? t.max(r) : t.min(r), o = i.parent.inlineContent ? i.depth ? n.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
  return o && U.findFrom(o, e);
}
function fn(n, e) {
  return n.dispatch(n.state.tr.setSelection(e).scrollIntoView()), !0;
}
function tf(n, e, t) {
  let r = n.state.selection;
  if (r instanceof J)
    if (t.indexOf("s") > -1) {
      let { $head: i } = r, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!o || o.isText || !o.isLeaf)
        return !1;
      let s = n.state.doc.resolve(i.pos + o.nodeSize * (e < 0 ? -1 : 1));
      return fn(n, new J(r.$anchor, s));
    } else if (r.empty) {
      if (n.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = fc(n.state, e);
        return i && i instanceof q ? fn(n, i) : !1;
      } else if (!(ct && t.indexOf("m") > -1)) {
        let i = r.$head, o = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, s;
        if (!o || o.isText)
          return !1;
        let l = e < 0 ? i.pos - o.nodeSize : i.pos;
        return o.isAtom || (s = n.docView.descAt(l)) && !s.contentDOM ? q.isSelectable(o) ? fn(n, new q(e < 0 ? n.state.doc.resolve(i.pos - o.nodeSize) : i)) : To ? fn(n, new J(n.state.doc.resolve(e < 0 ? l : l + o.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof q && r.node.isInline)
      return fn(n, new J(e > 0 ? r.$to : r.$from));
    {
      let i = fc(n.state, e);
      return i ? fn(n, i) : !1;
    }
  }
}
function Vs(n) {
  return n.nodeType == 3 ? n.nodeValue.length : n.childNodes.length;
}
function ji(n, e) {
  let t = n.pmViewDesc;
  return t && t.size == 0 && (e < 0 || n.nextSibling || n.nodeName != "BR");
}
function Cr(n, e) {
  return e < 0 ? GM(n) : YM(n);
}
function GM(n) {
  let e = n.domSelectionRange(), t = e.focusNode, r = e.focusOffset;
  if (!t)
    return;
  let i, o, s = !1;
  for (ft && t.nodeType == 1 && r < Vs(t) && ji(t.childNodes[r], -1) && (s = !0); ; )
    if (r > 0) {
      if (t.nodeType != 1)
        break;
      {
        let l = t.childNodes[r - 1];
        if (ji(l, -1))
          i = t, o = --r;
        else if (l.nodeType == 3)
          t = l, r = t.nodeValue.length;
        else
          break;
      }
    } else {
      if (wg(t))
        break;
      {
        let l = t.previousSibling;
        for (; l && ji(l, -1); )
          i = t.parentNode, o = Ne(l), l = l.previousSibling;
        if (l)
          t = l, r = Vs(t);
        else {
          if (t = t.parentNode, t == n.dom)
            break;
          r = 0;
        }
      }
    }
  s ? pc(n, t, r) : i && pc(n, i, o);
}
function YM(n) {
  let e = n.domSelectionRange(), t = e.focusNode, r = e.focusOffset;
  if (!t)
    return;
  let i = Vs(t), o, s;
  for (; ; )
    if (r < i) {
      if (t.nodeType != 1)
        break;
      let l = t.childNodes[r];
      if (ji(l, 1))
        o = t, s = ++r;
      else
        break;
    } else {
      if (wg(t))
        break;
      {
        let l = t.nextSibling;
        for (; l && ji(l, 1); )
          o = l.parentNode, s = Ne(l) + 1, l = l.nextSibling;
        if (l)
          t = l, r = 0, i = Vs(t);
        else {
          if (t = t.parentNode, t == n.dom)
            break;
          r = i = 0;
        }
      }
    }
  o && pc(n, o, s);
}
function wg(n) {
  let e = n.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function XM(n, e) {
  for (; n && e == n.childNodes.length && !Mo(n); )
    e = Ne(n) + 1, n = n.parentNode;
  for (; n && e < n.childNodes.length; ) {
    let t = n.childNodes[e];
    if (t.nodeType == 3)
      return t;
    if (t.nodeType == 1 && t.contentEditable == "false")
      break;
    n = t, e = 0;
  }
}
function QM(n, e) {
  for (; n && !e && !Mo(n); )
    e = Ne(n), n = n.parentNode;
  for (; n && e; ) {
    let t = n.childNodes[e - 1];
    if (t.nodeType == 3)
      return t;
    if (t.nodeType == 1 && t.contentEditable == "false")
      break;
    n = t, e = n.childNodes.length;
  }
}
function pc(n, e, t) {
  if (e.nodeType != 3) {
    let o, s;
    (s = XM(e, t)) ? (e = s, t = 0) : (o = QM(e, t)) && (e = o, t = o.nodeValue.length);
  }
  let r = n.domSelection();
  if (!r)
    return;
  if (pl(r)) {
    let o = document.createRange();
    o.setEnd(e, t), o.setStart(e, t), r.removeAllRanges(), r.addRange(o);
  } else r.extend && r.extend(e, t);
  n.domObserver.setCurSelection();
  let { state: i } = n;
  setTimeout(() => {
    n.state == i && tn(n);
  }, 50);
}
function nf(n, e) {
  let t = n.state.doc.resolve(e);
  if (!(Re || wM) && t.parent.inlineContent) {
    let i = n.coordsAtPos(e);
    if (e > t.start()) {
      let o = n.coordsAtPos(e - 1), s = (o.top + o.bottom) / 2;
      if (s > i.top && s < i.bottom && Math.abs(o.left - i.left) > 1)
        return o.left < i.left ? "ltr" : "rtl";
    }
    if (e < t.end()) {
      let o = n.coordsAtPos(e + 1), s = (o.top + o.bottom) / 2;
      if (s > i.top && s < i.bottom && Math.abs(o.left - i.left) > 1)
        return o.left > i.left ? "ltr" : "rtl";
    }
  }
  return getComputedStyle(n.dom).direction == "rtl" ? "rtl" : "ltr";
}
function rf(n, e, t) {
  let r = n.state.selection;
  if (r instanceof J && !r.empty || t.indexOf("s") > -1 || ct && t.indexOf("m") > -1)
    return !1;
  let { $from: i, $to: o } = r;
  if (!i.parent.inlineContent || n.endOfTextblock(e < 0 ? "up" : "down")) {
    let s = fc(n.state, e);
    if (s && s instanceof q)
      return fn(n, s);
  }
  if (!i.parent.inlineContent) {
    let s = e < 0 ? i : o, l = r instanceof tt ? U.near(s, e) : U.findFrom(s, e);
    return l ? fn(n, l) : !1;
  }
  return !1;
}
function of(n, e) {
  if (!(n.state.selection instanceof J))
    return !0;
  let { $head: t, $anchor: r, empty: i } = n.state.selection;
  if (!t.sameParent(r))
    return !0;
  if (!i)
    return !1;
  if (n.endOfTextblock(e > 0 ? "forward" : "backward"))
    return !0;
  let o = !t.textOffset && (e < 0 ? t.nodeBefore : t.nodeAfter);
  if (o && !o.isText) {
    let s = n.state.tr;
    return e < 0 ? s.delete(t.pos - o.nodeSize, t.pos) : s.delete(t.pos, t.pos + o.nodeSize), n.dispatch(s), !0;
  }
  return !1;
}
function sf(n, e, t) {
  n.domObserver.stop(), e.contentEditable = t, n.domObserver.start();
}
function ZM(n) {
  if (!Be || n.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: t } = n.domSelectionRange();
  if (e && e.nodeType == 1 && t == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    sf(n, r, "true"), setTimeout(() => sf(n, r, "false"), 20);
  }
  return !1;
}
function eT(n) {
  let e = "";
  return n.ctrlKey && (e += "c"), n.metaKey && (e += "m"), n.altKey && (e += "a"), n.shiftKey && (e += "s"), e;
}
function tT(n, e) {
  let t = e.keyCode, r = eT(e);
  if (t == 8 || ct && t == 72 && r == "c")
    return of(n, -1) || Cr(n, -1);
  if (t == 46 && !e.shiftKey || ct && t == 68 && r == "c")
    return of(n, 1) || Cr(n, 1);
  if (t == 13 || t == 27)
    return !0;
  if (t == 37 || ct && t == 66 && r == "c") {
    let i = t == 37 ? nf(n, n.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return tf(n, i, r) || Cr(n, i);
  } else if (t == 39 || ct && t == 70 && r == "c") {
    let i = t == 39 ? nf(n, n.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return tf(n, i, r) || Cr(n, i);
  } else {
    if (t == 38 || ct && t == 80 && r == "c")
      return rf(n, -1, r) || Cr(n, -1);
    if (t == 40 || ct && t == 78 && r == "c")
      return ZM(n) || rf(n, 1, r) || Cr(n, 1);
    if (r == (ct ? "m" : "c") && (t == 66 || t == 73 || t == 89 || t == 90))
      return !0;
  }
  return !1;
}
function au(n, e) {
  n.someProp("transformCopied", (f) => {
    e = f(e, n);
  });
  let t = [], { content: r, openStart: i, openEnd: o } = e;
  for (; i > 1 && o > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    i--, o--;
    let f = r.firstChild;
    t.push(f.type.name, f.attrs != f.type.defaultAttrs ? f.attrs : null), r = f.content;
  }
  let s = n.someProp("clipboardSerializer") || si.fromSchema(n.state.schema), l = Mg(), a = l.createElement("div");
  a.appendChild(s.serializeFragment(r, { document: l }));
  let c = a.firstChild, u, d = 0;
  for (; c && c.nodeType == 1 && (u = Eg[c.nodeName.toLowerCase()]); ) {
    for (let f = u.length - 1; f >= 0; f--) {
      let p = l.createElement(u[f]);
      for (; a.firstChild; )
        p.appendChild(a.firstChild);
      a.appendChild(p), d++;
    }
    c = a.firstChild;
  }
  c && c.nodeType == 1 && c.setAttribute("data-pm-slice", `${i} ${o}${d ? ` -${d}` : ""} ${JSON.stringify(t)}`);
  let h = n.someProp("clipboardTextSerializer", (f) => f(e, n)) || e.content.textBetween(0, e.content.size, `

`);
  return { dom: a, text: h, slice: e };
}
function Cg(n, e, t, r, i) {
  let o = i.parent.type.spec.code, s, l;
  if (!t && !e)
    return null;
  let a = !!e && (r || o || !t);
  if (a) {
    if (n.someProp("transformPastedText", (h) => {
      e = h(e, o || r, n);
    }), o)
      return l = new R(N.from(n.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), n.someProp("transformPasted", (h) => {
        l = h(l, n, !0);
      }), l;
    let d = n.someProp("clipboardTextParser", (h) => h(e, i, r, n));
    if (d)
      l = d;
    else {
      let h = i.marks(), { schema: f } = n.state, p = si.fromSchema(f);
      s = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((m) => {
        let y = s.appendChild(document.createElement("p"));
        m && y.appendChild(p.serializeNode(f.text(m, h)));
      });
    }
  } else
    n.someProp("transformPastedHTML", (d) => {
      t = d(t, n);
    }), s = oT(t), To && sT(s);
  let c = s && s.querySelector("[data-pm-slice]"), u = c && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(c.getAttribute("data-pm-slice") || "");
  if (u && u[3])
    for (let d = +u[3]; d > 0; d--) {
      let h = s.firstChild;
      for (; h && h.nodeType != 1; )
        h = h.nextSibling;
      if (!h)
        break;
      s = h;
    }
  if (l || (l = (n.someProp("clipboardParser") || n.someProp("domParser") || Qr.fromSchema(n.state.schema)).parseSlice(s, {
    preserveWhitespace: !!(a || u),
    context: i,
    ruleFromNode(h) {
      return h.nodeName == "BR" && !h.nextSibling && h.parentNode && !nT.test(h.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), u)
    l = lT(lf(l, +u[1], +u[2]), u[4]);
  else if (l = R.maxOpen(rT(l.content, i), !0), l.openStart || l.openEnd) {
    let d = 0, h = 0;
    for (let f = l.content.firstChild; d < l.openStart && !f.type.spec.isolating; d++, f = f.firstChild)
      ;
    for (let f = l.content.lastChild; h < l.openEnd && !f.type.spec.isolating; h++, f = f.lastChild)
      ;
    l = lf(l, d, h);
  }
  return n.someProp("transformPasted", (d) => {
    l = d(l, n, a);
  }), l;
}
const nT = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function rT(n, e) {
  if (n.childCount < 2)
    return n;
  for (let t = e.depth; t >= 0; t--) {
    let i = e.node(t).contentMatchAt(e.index(t)), o, s = [];
    if (n.forEach((l) => {
      if (!s)
        return;
      let a = i.findWrapping(l.type), c;
      if (!a)
        return s = null;
      if (c = s.length && o.length && xg(a, o, l, s[s.length - 1], 0))
        s[s.length - 1] = c;
      else {
        s.length && (s[s.length - 1] = vg(s[s.length - 1], o.length));
        let u = Sg(l, a);
        s.push(u), i = i.matchType(u.type), o = a;
      }
    }), s)
      return N.from(s);
  }
  return n;
}
function Sg(n, e, t = 0) {
  for (let r = e.length - 1; r >= t; r--)
    n = e[r].create(null, N.from(n));
  return n;
}
function xg(n, e, t, r, i) {
  if (i < n.length && i < e.length && n[i] == e[i]) {
    let o = xg(n, e, t, r.lastChild, i + 1);
    if (o)
      return r.copy(r.content.replaceChild(r.childCount - 1, o));
    if (r.contentMatchAt(r.childCount).matchType(i == n.length - 1 ? t.type : n[i + 1]))
      return r.copy(r.content.append(N.from(Sg(t, n, i + 1))));
  }
}
function vg(n, e) {
  if (e == 0)
    return n;
  let t = n.content.replaceChild(n.childCount - 1, vg(n.lastChild, e - 1)), r = n.contentMatchAt(n.childCount).fillBefore(N.empty, !0);
  return n.copy(t.append(r));
}
function mc(n, e, t, r, i, o) {
  let s = e < 0 ? n.firstChild : n.lastChild, l = s.content;
  return n.childCount > 1 && (o = 0), i < r - 1 && (l = mc(l, e, t, r, i + 1, o)), i >= t && (l = e < 0 ? s.contentMatchAt(0).fillBefore(l, o <= i).append(l) : l.append(s.contentMatchAt(s.childCount).fillBefore(N.empty, !0))), n.replaceChild(e < 0 ? 0 : n.childCount - 1, s.copy(l));
}
function lf(n, e, t) {
  return e < n.openStart && (n = new R(mc(n.content, -1, e, n.openStart, 0, n.openEnd), e, n.openEnd)), t < n.openEnd && (n = new R(mc(n.content, 1, t, n.openEnd, 0, 0), n.openStart, t)), n;
}
const Eg = {
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
  col: ["table", "colgroup"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
};
let af = null;
function Mg() {
  return af || (af = document.implementation.createHTMLDocument("title"));
}
let da = null;
function iT(n) {
  let e = window.trustedTypes;
  return e ? (da || (da = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (t) => t })), da.createHTML(n)) : n;
}
function oT(n) {
  let e = /^(\s*<meta [^>]*>)*/.exec(n);
  e && (n = n.slice(e[0].length));
  let t = Mg().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(n), i;
  if ((i = r && Eg[r[1].toLowerCase()]) && (n = i.map((o) => "<" + o + ">").join("") + n + i.map((o) => "</" + o + ">").reverse().join("")), t.innerHTML = iT(n), i)
    for (let o = 0; o < i.length; o++)
      t = t.querySelector(i[o]) || t;
  return t;
}
function sT(n) {
  let e = n.querySelectorAll(Re ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let t = 0; t < e.length; t++) {
    let r = e[t];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(n.ownerDocument.createTextNode(" "), r);
  }
}
function lT(n, e) {
  if (!n.size)
    return n;
  let t = n.content.firstChild.type.schema, r;
  try {
    r = JSON.parse(e);
  } catch {
    return n;
  }
  let { content: i, openStart: o, openEnd: s } = n;
  for (let l = r.length - 2; l >= 0; l -= 2) {
    let a = t.nodes[r[l]];
    if (!a || a.hasRequiredAttrs())
      break;
    i = N.from(a.create(r[l + 1], i)), o++, s++;
  }
  return new R(i, o, s);
}
const $e = {}, ze = {}, aT = { touchstart: !0, touchmove: !0 };
class cT {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function uT(n) {
  for (let e in $e) {
    let t = $e[e];
    n.dom.addEventListener(e, n.input.eventHandlers[e] = (r) => {
      hT(n, r) && !cu(n, r) && (n.editable || !(r.type in ze)) && t(n, r);
    }, aT[e] ? { passive: !0 } : void 0);
  }
  Be && n.dom.addEventListener("input", () => null), gc(n);
}
function Cn(n, e) {
  n.input.lastSelectionOrigin = e, n.input.lastSelectionTime = Date.now();
}
function dT(n) {
  n.domObserver.stop();
  for (let e in n.input.eventHandlers)
    n.dom.removeEventListener(e, n.input.eventHandlers[e]);
  clearTimeout(n.input.composingTimeout), clearTimeout(n.input.lastIOSEnterFallbackTimeout);
}
function gc(n) {
  n.someProp("handleDOMEvents", (e) => {
    for (let t in e)
      n.input.eventHandlers[t] || n.dom.addEventListener(t, n.input.eventHandlers[t] = (r) => cu(n, r));
  });
}
function cu(n, e) {
  return n.someProp("handleDOMEvents", (t) => {
    let r = t[e.type];
    return r ? r(n, e) || e.defaultPrevented : !1;
  });
}
function hT(n, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let t = e.target; t != n.dom; t = t.parentNode)
    if (!t || t.nodeType == 11 || t.pmViewDesc && t.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function fT(n, e) {
  !cu(n, e) && $e[e.type] && (n.editable || !(e.type in ze)) && $e[e.type](n, e);
}
ze.keydown = (n, e) => {
  let t = e;
  if (n.input.shiftKey = t.keyCode == 16 || t.shiftKey, !Ng(n, t) && (n.input.lastKeyCode = t.keyCode, n.input.lastKeyCodeTime = Date.now(), !(en && Re && t.keyCode == 13)))
    if (t.keyCode != 229 && n.domObserver.forceFlush(), ni && t.keyCode == 13 && !t.ctrlKey && !t.altKey && !t.metaKey) {
      let r = Date.now();
      n.input.lastIOSEnter = r, n.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        n.input.lastIOSEnter == r && (n.someProp("handleKeyDown", (i) => i(n, qn(13, "Enter"))), n.input.lastIOSEnter = 0);
      }, 200);
    } else n.someProp("handleKeyDown", (r) => r(n, t)) || tT(n, t) ? t.preventDefault() : Cn(n, "key");
};
ze.keyup = (n, e) => {
  e.keyCode == 16 && (n.input.shiftKey = !1);
};
ze.keypress = (n, e) => {
  let t = e;
  if (Ng(n, t) || !t.charCode || t.ctrlKey && !t.altKey || ct && t.metaKey)
    return;
  if (n.someProp("handleKeyPress", (i) => i(n, t))) {
    t.preventDefault();
    return;
  }
  let r = n.state.selection;
  if (!(r instanceof J) || !r.$from.sameParent(r.$to)) {
    let i = String.fromCharCode(t.charCode), o = () => n.state.tr.insertText(i).scrollIntoView();
    !/[\r\n]/.test(i) && !n.someProp("handleTextInput", (s) => s(n, r.$from.pos, r.$to.pos, i, o)) && n.dispatch(o()), t.preventDefault();
  }
};
function gl(n) {
  return { left: n.clientX, top: n.clientY };
}
function pT(n, e) {
  let t = e.x - n.clientX, r = e.y - n.clientY;
  return t * t + r * r < 100;
}
function uu(n, e, t, r, i) {
  if (r == -1)
    return !1;
  let o = n.state.doc.resolve(r);
  for (let s = o.depth + 1; s > 0; s--)
    if (n.someProp(e, (l) => s > o.depth ? l(n, t, o.nodeAfter, o.before(s), i, !0) : l(n, t, o.node(s), o.before(s), i, !1)))
      return !0;
  return !1;
}
function Br(n, e, t) {
  if (n.focused || n.focus(), n.state.selection.eq(e))
    return;
  let r = n.state.tr.setSelection(e);
  r.setMeta("pointer", !0), n.dispatch(r);
}
function mT(n, e) {
  if (e == -1)
    return !1;
  let t = n.state.doc.resolve(e), r = t.nodeAfter;
  return r && r.isAtom && q.isSelectable(r) ? (Br(n, new q(t)), !0) : !1;
}
function gT(n, e) {
  if (e == -1)
    return !1;
  let t = n.state.selection, r, i;
  t instanceof q && (r = t.node);
  let o = n.state.doc.resolve(e);
  for (let s = o.depth + 1; s > 0; s--) {
    let l = s > o.depth ? o.nodeAfter : o.node(s);
    if (q.isSelectable(l)) {
      r && t.$from.depth > 0 && s >= t.$from.depth && o.before(t.$from.depth + 1) == t.$from.pos ? i = o.before(t.$from.depth) : i = o.before(s);
      break;
    }
  }
  return i != null ? (Br(n, q.create(n.state.doc, i)), !0) : !1;
}
function yT(n, e, t, r, i) {
  return uu(n, "handleClickOn", e, t, r) || n.someProp("handleClick", (o) => o(n, e, r)) || (i ? gT(n, t) : mT(n, t));
}
function bT(n, e, t, r) {
  return uu(n, "handleDoubleClickOn", e, t, r) || n.someProp("handleDoubleClick", (i) => i(n, e, r));
}
function kT(n, e, t, r) {
  return uu(n, "handleTripleClickOn", e, t, r) || n.someProp("handleTripleClick", (i) => i(n, e, r)) || wT(n, t, r);
}
function wT(n, e, t) {
  if (t.button != 0)
    return !1;
  let r = n.state.doc;
  if (e == -1)
    return r.inlineContent ? (Br(n, J.create(r, 0, r.content.size)), !0) : !1;
  let i = r.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let s = o > i.depth ? i.nodeAfter : i.node(o), l = i.before(o);
    if (s.inlineContent)
      Br(n, J.create(r, l + 1, l + 1 + s.content.size));
    else if (q.isSelectable(s))
      Br(n, q.create(r, l));
    else
      continue;
    return !0;
  }
}
function du(n) {
  return Us(n);
}
const Tg = ct ? "metaKey" : "ctrlKey";
$e.mousedown = (n, e) => {
  let t = e;
  n.input.shiftKey = t.shiftKey;
  let r = du(n), i = Date.now(), o = "singleClick";
  i - n.input.lastClick.time < 500 && pT(t, n.input.lastClick) && !t[Tg] && n.input.lastClick.button == t.button && (n.input.lastClick.type == "singleClick" ? o = "doubleClick" : n.input.lastClick.type == "doubleClick" && (o = "tripleClick")), n.input.lastClick = { time: i, x: t.clientX, y: t.clientY, type: o, button: t.button };
  let s = n.posAtCoords(gl(t));
  s && (o == "singleClick" ? (n.input.mouseDown && n.input.mouseDown.done(), n.input.mouseDown = new CT(n, s, t, !!r)) : (o == "doubleClick" ? bT : kT)(n, s.pos, s.inside, t) ? t.preventDefault() : Cn(n, "pointer"));
};
class CT {
  constructor(e, t, r, i) {
    this.view = e, this.pos = t, this.event = r, this.flushed = i, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[Tg], this.allowDefault = r.shiftKey;
    let o, s;
    if (t.inside > -1)
      o = e.state.doc.nodeAt(t.inside), s = t.inside;
    else {
      let u = e.state.doc.resolve(t.pos);
      o = u.parent, s = u.depth ? u.before() : 0;
    }
    const l = i ? null : r.target, a = l ? e.docView.nearestDesc(l, !0) : null;
    this.target = a && a.nodeDOM.nodeType == 1 ? a.nodeDOM : null;
    let { selection: c } = e.state;
    (r.button == 0 && o.type.spec.draggable && o.type.spec.selectable !== !1 || c instanceof q && c.from <= s && c.to > s) && (this.mightDrag = {
      node: o,
      pos: s,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && ft && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), Cn(e, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => tn(this.view)), this.view.input.mouseDown = null;
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let t = this.pos;
    this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(gl(e))), this.updateAllowDefault(e), this.allowDefault || !t ? Cn(this.view, "pointer") : yT(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    Be && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    Re && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Br(this.view, U.near(this.view.state.doc.resolve(t.pos))), e.preventDefault()) : Cn(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), Cn(this.view, "pointer"), e.buttons == 0 && this.done();
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
}
$e.touchstart = (n) => {
  n.input.lastTouch = Date.now(), du(n), Cn(n, "pointer");
};
$e.touchmove = (n) => {
  n.input.lastTouch = Date.now(), Cn(n, "pointer");
};
$e.contextmenu = (n) => du(n);
function Ng(n, e) {
  return n.composing ? !0 : Be && Math.abs(e.timeStamp - n.input.compositionEndedAt) < 500 ? (n.input.compositionEndedAt = -2e8, !0) : !1;
}
const ST = en ? 5e3 : -1;
ze.compositionstart = ze.compositionupdate = (n) => {
  if (!n.composing) {
    n.domObserver.flush();
    let { state: e } = n, t = e.selection.$to;
    if (e.selection instanceof J && (e.storedMarks || !t.textOffset && t.parentOffset && t.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1)))
      n.markCursor = n.state.storedMarks || t.marks(), Us(n, !0), n.markCursor = null;
    else if (Us(n, !e.selection.empty), ft && e.selection.empty && t.parentOffset && !t.textOffset && t.nodeBefore.marks.length) {
      let r = n.domSelectionRange();
      for (let i = r.focusNode, o = r.focusOffset; i && i.nodeType == 1 && o != 0; ) {
        let s = o < 0 ? i.lastChild : i.childNodes[o - 1];
        if (!s)
          break;
        if (s.nodeType == 3) {
          let l = n.domSelection();
          l && l.collapse(s, s.nodeValue.length);
          break;
        } else
          i = s, o = -1;
      }
    }
    n.input.composing = !0;
  }
  Ig(n, ST);
};
ze.compositionend = (n, e) => {
  n.composing && (n.input.composing = !1, n.input.compositionEndedAt = e.timeStamp, n.input.compositionPendingChanges = n.domObserver.pendingRecords().length ? n.input.compositionID : 0, n.input.compositionNode = null, n.input.compositionPendingChanges && Promise.resolve().then(() => n.domObserver.flush()), n.input.compositionID++, Ig(n, 20));
};
function Ig(n, e) {
  clearTimeout(n.input.composingTimeout), e > -1 && (n.input.composingTimeout = setTimeout(() => Us(n), e));
}
function Ag(n) {
  for (n.composing && (n.input.composing = !1, n.input.compositionEndedAt = vT()); n.input.compositionNodes.length > 0; )
    n.input.compositionNodes.pop().markParentsDirty();
}
function xT(n) {
  let e = n.domSelectionRange();
  if (!e.focusNode)
    return null;
  let t = mM(e.focusNode, e.focusOffset), r = gM(e.focusNode, e.focusOffset);
  if (t && r && t != r) {
    let i = r.pmViewDesc, o = n.domObserver.lastChangedTextNode;
    if (t == o || r == o)
      return o;
    if (!i || !i.isText(r.nodeValue))
      return r;
    if (n.input.compositionNode == r) {
      let s = t.pmViewDesc;
      if (!(!s || !s.isText(t.nodeValue)))
        return r;
    }
  }
  return t || r;
}
function vT() {
  let n = document.createEvent("Event");
  return n.initEvent("event", !0, !0), n.timeStamp;
}
function Us(n, e = !1) {
  if (!(en && n.domObserver.flushingSoon >= 0)) {
    if (n.domObserver.forceFlush(), Ag(n), e || n.docView && n.docView.dirty) {
      let t = su(n), r = n.state.selection;
      return t && !t.eq(r) ? n.dispatch(n.state.tr.setSelection(t)) : (n.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? n.dispatch(n.state.tr.deleteSelection()) : n.updateState(n.state), !0;
    }
    return !1;
  }
}
function ET(n, e) {
  if (!n.dom.parentNode)
    return;
  let t = n.dom.parentNode.appendChild(document.createElement("div"));
  t.appendChild(e), t.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), i = document.createRange();
  i.selectNodeContents(e), n.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
    t.parentNode && t.parentNode.removeChild(t), n.focus();
  }, 50);
}
const oo = Ve && vn < 15 || ni && CM < 604;
$e.copy = ze.cut = (n, e) => {
  let t = e, r = n.state.selection, i = t.type == "cut";
  if (r.empty)
    return;
  let o = oo ? null : t.clipboardData, s = r.content(), { dom: l, text: a } = au(n, s);
  o ? (t.preventDefault(), o.clearData(), o.setData("text/html", l.innerHTML), o.setData("text/plain", a)) : ET(n, l), i && n.dispatch(n.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function MT(n) {
  return n.openStart == 0 && n.openEnd == 0 && n.content.childCount == 1 ? n.content.firstChild : null;
}
function TT(n, e) {
  if (!n.dom.parentNode)
    return;
  let t = n.input.shiftKey || n.state.selection.$from.parent.type.spec.code, r = n.dom.parentNode.appendChild(document.createElement(t ? "textarea" : "div"));
  t || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let i = n.input.shiftKey && n.input.lastKeyCode != 45;
  setTimeout(() => {
    n.focus(), r.parentNode && r.parentNode.removeChild(r), t ? so(n, r.value, null, i, e) : so(n, r.textContent, r.innerHTML, i, e);
  }, 50);
}
function so(n, e, t, r, i) {
  let o = Cg(n, e, t, r, n.state.selection.$from);
  if (n.someProp("handlePaste", (a) => a(n, i, o || R.empty)))
    return !0;
  if (!o)
    return !1;
  let s = MT(o), l = s ? n.state.tr.replaceSelectionWith(s, r) : n.state.tr.replaceSelection(o);
  return n.dispatch(l.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function Og(n) {
  let e = n.getData("text/plain") || n.getData("Text");
  if (e)
    return e;
  let t = n.getData("text/uri-list");
  return t ? t.replace(/\r?\n/g, " ") : "";
}
ze.paste = (n, e) => {
  let t = e;
  if (n.composing && !en)
    return;
  let r = oo ? null : t.clipboardData, i = n.input.shiftKey && n.input.lastKeyCode != 45;
  r && so(n, Og(r), r.getData("text/html"), i, t) ? t.preventDefault() : TT(n, t);
};
class Rg {
  constructor(e, t, r) {
    this.slice = e, this.move = t, this.node = r;
  }
}
const NT = ct ? "altKey" : "ctrlKey";
function Dg(n, e) {
  let t = n.someProp("dragCopies", (r) => !r(e));
  return t ?? !e[NT];
}
$e.dragstart = (n, e) => {
  let t = e, r = n.input.mouseDown;
  if (r && r.done(), !t.dataTransfer)
    return;
  let i = n.state.selection, o = i.empty ? null : n.posAtCoords(gl(t)), s;
  if (!(o && o.pos >= i.from && o.pos <= (i instanceof q ? i.to - 1 : i.to))) {
    if (r && r.mightDrag)
      s = q.create(n.state.doc, r.mightDrag.pos);
    else if (t.target && t.target.nodeType == 1) {
      let d = n.docView.nearestDesc(t.target, !0);
      d && d.node.type.spec.draggable && d != n.docView && (s = q.create(n.state.doc, d.posBefore));
    }
  }
  let l = (s || n.state.selection).content(), { dom: a, text: c, slice: u } = au(n, l);
  (!t.dataTransfer.files.length || !Re || og > 120) && t.dataTransfer.clearData(), t.dataTransfer.setData(oo ? "Text" : "text/html", a.innerHTML), t.dataTransfer.effectAllowed = "copyMove", oo || t.dataTransfer.setData("text/plain", c), n.dragging = new Rg(u, Dg(n, t), s);
};
$e.dragend = (n) => {
  let e = n.dragging;
  window.setTimeout(() => {
    n.dragging == e && (n.dragging = null);
  }, 50);
};
ze.dragover = ze.dragenter = (n, e) => e.preventDefault();
ze.drop = (n, e) => {
  let t = e, r = n.dragging;
  if (n.dragging = null, !t.dataTransfer)
    return;
  let i = n.posAtCoords(gl(t));
  if (!i)
    return;
  let o = n.state.doc.resolve(i.pos), s = r && r.slice;
  s ? n.someProp("transformPasted", (p) => {
    s = p(s, n, !1);
  }) : s = Cg(n, Og(t.dataTransfer), oo ? null : t.dataTransfer.getData("text/html"), !1, o);
  let l = !!(r && Dg(n, t));
  if (n.someProp("handleDrop", (p) => p(n, t, s || R.empty, l))) {
    t.preventDefault();
    return;
  }
  if (!s)
    return;
  t.preventDefault();
  let a = s ? yE(n.state.doc, o.pos, s) : o.pos;
  a == null && (a = o.pos);
  let c = n.state.tr;
  if (l) {
    let { node: p } = r;
    p ? p.replace(c) : c.deleteSelection();
  }
  let u = c.mapping.map(a), d = s.openStart == 0 && s.openEnd == 0 && s.content.childCount == 1, h = c.doc;
  if (d ? c.replaceRangeWith(u, u, s.content.firstChild) : c.replaceRange(u, u, s), c.doc.eq(h))
    return;
  let f = c.doc.resolve(u);
  if (d && q.isSelectable(s.content.firstChild) && f.nodeAfter && f.nodeAfter.sameMarkup(s.content.firstChild))
    c.setSelection(new q(f));
  else {
    let p = c.mapping.map(a);
    c.mapping.maps[c.mapping.maps.length - 1].forEach((m, y, g, C) => p = C), c.setSelection(lu(n, f, c.doc.resolve(p)));
  }
  n.focus(), n.dispatch(c.setMeta("uiEvent", "drop"));
};
$e.focus = (n) => {
  n.input.lastFocus = Date.now(), n.focused || (n.domObserver.stop(), n.dom.classList.add("ProseMirror-focused"), n.domObserver.start(), n.focused = !0, setTimeout(() => {
    n.docView && n.hasFocus() && !n.domObserver.currentSelection.eq(n.domSelectionRange()) && tn(n);
  }, 20));
};
$e.blur = (n, e) => {
  let t = e;
  n.focused && (n.domObserver.stop(), n.dom.classList.remove("ProseMirror-focused"), n.domObserver.start(), t.relatedTarget && n.dom.contains(t.relatedTarget) && n.domObserver.currentSelection.clear(), n.focused = !1);
};
$e.beforeinput = (n, e) => {
  if (Re && en && e.inputType == "deleteContentBackward") {
    n.domObserver.flushSoon();
    let { domChangeCount: r } = n.input;
    setTimeout(() => {
      if (n.input.domChangeCount != r || (n.dom.blur(), n.focus(), n.someProp("handleKeyDown", (o) => o(n, qn(8, "Backspace")))))
        return;
      let { $cursor: i } = n.state.selection;
      i && i.pos > 0 && n.dispatch(n.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
    }, 50);
  }
};
for (let n in ze)
  $e[n] = ze[n];
function lo(n, e) {
  if (n == e)
    return !0;
  for (let t in n)
    if (n[t] !== e[t])
      return !1;
  for (let t in e)
    if (!(t in n))
      return !1;
  return !0;
}
class Ws {
  constructor(e, t) {
    this.toDOM = e, this.spec = t || er, this.side = this.spec.side || 0;
  }
  map(e, t, r, i) {
    let { pos: o, deleted: s } = e.mapResult(t.from + i, this.side < 0 ? -1 : 1);
    return s ? null : new Ce(o - r, o - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof Ws && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && lo(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class Mn {
  constructor(e, t) {
    this.attrs = e, this.spec = t || er;
  }
  map(e, t, r, i) {
    let o = e.map(t.from + i, this.spec.inclusiveStart ? -1 : 1) - r, s = e.map(t.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
    return o >= s ? null : new Ce(o, s, this);
  }
  valid(e, t) {
    return t.from < t.to;
  }
  eq(e) {
    return this == e || e instanceof Mn && lo(this.attrs, e.attrs) && lo(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof Mn;
  }
  destroy() {
  }
}
class hu {
  constructor(e, t) {
    this.attrs = e, this.spec = t || er;
  }
  map(e, t, r, i) {
    let o = e.mapResult(t.from + i, 1);
    if (o.deleted)
      return null;
    let s = e.mapResult(t.to + i, -1);
    return s.deleted || s.pos <= o.pos ? null : new Ce(o.pos - r, s.pos - r, this);
  }
  valid(e, t) {
    let { index: r, offset: i } = e.content.findIndex(t.from), o;
    return i == t.from && !(o = e.child(r)).isText && i + o.nodeSize == t.to;
  }
  eq(e) {
    return this == e || e instanceof hu && lo(this.attrs, e.attrs) && lo(this.spec, e.spec);
  }
  destroy() {
  }
}
class Ce {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.from = e, this.to = t, this.type = r;
  }
  /**
  @internal
  */
  copy(e, t) {
    return new Ce(e, t, this.type);
  }
  /**
  @internal
  */
  eq(e, t = 0) {
    return this.type.eq(e.type) && this.from + t == e.from && this.to + t == e.to;
  }
  /**
  @internal
  */
  map(e, t, r) {
    return this.type.map(e, this, t, r);
  }
  /**
  Creates a widget decoration, which is a DOM node that's shown in
  the document at the given position. It is recommended that you
  delay rendering the widget by passing a function that will be
  called when the widget is actually drawn in a view, but you can
  also directly pass a DOM node. `getPos` can be used to find the
  widget's current document position.
  */
  static widget(e, t, r) {
    return new Ce(e, e, new Ws(t, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, t, r, i) {
    return new Ce(e, t, new Mn(r, i));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, t, r, i) {
    return new Ce(e, t, new hu(r, i));
  }
  /**
  The spec provided when creating this decoration. Can be useful
  if you've stored extra information in that object.
  */
  get spec() {
    return this.type.spec;
  }
  /**
  @internal
  */
  get inline() {
    return this.type instanceof Mn;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof Ws;
  }
}
const Mr = [], er = {};
class se {
  /**
  @internal
  */
  constructor(e, t) {
    this.local = e.length ? e : Mr, this.children = t.length ? t : Mr;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, t) {
    return t.length ? Ks(t, e, 0, er) : Ae;
  }
  /**
  Find all decorations in this set which touch the given range
  (including decorations that start or end directly at the
  boundaries) and match the given predicate on their spec. When
  `start` and `end` are omitted, all decorations in the set are
  considered. When `predicate` isn't given, all decorations are
  assumed to match.
  */
  find(e, t, r) {
    let i = [];
    return this.findInner(e ?? 0, t ?? 1e9, i, 0, r), i;
  }
  findInner(e, t, r, i, o) {
    for (let s = 0; s < this.local.length; s++) {
      let l = this.local[s];
      l.from <= t && l.to >= e && (!o || o(l.spec)) && r.push(l.copy(l.from + i, l.to + i));
    }
    for (let s = 0; s < this.children.length; s += 3)
      if (this.children[s] < t && this.children[s + 1] > e) {
        let l = this.children[s] + 1;
        this.children[s + 2].findInner(e - l, t - l, r, i + l, o);
      }
  }
  /**
  Map the set of decorations in response to a change in the
  document.
  */
  map(e, t, r) {
    return this == Ae || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, r || er);
  }
  /**
  @internal
  */
  mapInner(e, t, r, i, o) {
    let s;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l].map(e, r, i);
      a && a.type.valid(t, a) ? (s || (s = [])).push(a) : o.onRemove && o.onRemove(this.local[l].spec);
    }
    return this.children.length ? IT(this.children, s || [], e, t, r, i, o) : s ? new se(s.sort(tr), Mr) : Ae;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, t) {
    return t.length ? this == Ae ? se.create(e, t) : this.addInner(e, t, 0) : this;
  }
  addInner(e, t, r) {
    let i, o = 0;
    e.forEach((l, a) => {
      let c = a + r, u;
      if (u = Pg(t, l, c)) {
        for (i || (i = this.children.slice()); o < i.length && i[o] < a; )
          o += 3;
        i[o] == a ? i[o + 2] = i[o + 2].addInner(l, u, c + 1) : i.splice(o, 0, a, a + l.nodeSize, Ks(u, l, c + 1, er)), o += 3;
      }
    });
    let s = Lg(o ? Bg(t) : t, -r);
    for (let l = 0; l < s.length; l++)
      s[l].type.valid(e, s[l]) || s.splice(l--, 1);
    return new se(s.length ? this.local.concat(s).sort(tr) : this.local, i || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == Ae ? this : this.removeInner(e, 0);
  }
  removeInner(e, t) {
    let r = this.children, i = this.local;
    for (let o = 0; o < r.length; o += 3) {
      let s, l = r[o] + t, a = r[o + 1] + t;
      for (let u = 0, d; u < e.length; u++)
        (d = e[u]) && d.from > l && d.to < a && (e[u] = null, (s || (s = [])).push(d));
      if (!s)
        continue;
      r == this.children && (r = this.children.slice());
      let c = r[o + 2].removeInner(s, l + 1);
      c != Ae ? r[o + 2] = c : (r.splice(o, 3), o -= 3);
    }
    if (i.length) {
      for (let o = 0, s; o < e.length; o++)
        if (s = e[o])
          for (let l = 0; l < i.length; l++)
            i[l].eq(s, t) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
    }
    return r == this.children && i == this.local ? this : i.length || r.length ? new se(i, r) : Ae;
  }
  forChild(e, t) {
    if (this == Ae)
      return this;
    if (t.isLeaf)
      return se.empty;
    let r, i;
    for (let l = 0; l < this.children.length; l += 3)
      if (this.children[l] >= e) {
        this.children[l] == e && (r = this.children[l + 2]);
        break;
      }
    let o = e + 1, s = o + t.content.size;
    for (let l = 0; l < this.local.length; l++) {
      let a = this.local[l];
      if (a.from < s && a.to > o && a.type instanceof Mn) {
        let c = Math.max(o, a.from) - o, u = Math.min(s, a.to) - o;
        c < u && (i || (i = [])).push(a.copy(c, u));
      }
    }
    if (i) {
      let l = new se(i.sort(tr), Mr);
      return r ? new mn([l, r]) : l;
    }
    return r || Ae;
  }
  /**
  @internal
  */
  eq(e) {
    if (this == e)
      return !0;
    if (!(e instanceof se) || this.local.length != e.local.length || this.children.length != e.children.length)
      return !1;
    for (let t = 0; t < this.local.length; t++)
      if (!this.local[t].eq(e.local[t]))
        return !1;
    for (let t = 0; t < this.children.length; t += 3)
      if (this.children[t] != e.children[t] || this.children[t + 1] != e.children[t + 1] || !this.children[t + 2].eq(e.children[t + 2]))
        return !1;
    return !0;
  }
  /**
  @internal
  */
  locals(e) {
    return fu(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == Ae)
      return Mr;
    if (e.inlineContent || !this.local.some(Mn.is))
      return this.local;
    let t = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof Mn || t.push(this.local[r]);
    return t;
  }
  forEachSet(e) {
    e(this);
  }
}
se.empty = new se([], []);
se.removeOverlap = fu;
const Ae = se.empty;
class mn {
  constructor(e) {
    this.members = e;
  }
  map(e, t) {
    const r = this.members.map((i) => i.map(e, t, er));
    return mn.from(r);
  }
  forChild(e, t) {
    if (t.isLeaf)
      return se.empty;
    let r = [];
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].forChild(e, t);
      o != Ae && (o instanceof mn ? r = r.concat(o.members) : r.push(o));
    }
    return mn.from(r);
  }
  eq(e) {
    if (!(e instanceof mn) || e.members.length != this.members.length)
      return !1;
    for (let t = 0; t < this.members.length; t++)
      if (!this.members[t].eq(e.members[t]))
        return !1;
    return !0;
  }
  locals(e) {
    let t, r = !0;
    for (let i = 0; i < this.members.length; i++) {
      let o = this.members[i].localsInner(e);
      if (o.length)
        if (!t)
          t = o;
        else {
          r && (t = t.slice(), r = !1);
          for (let s = 0; s < o.length; s++)
            t.push(o[s]);
        }
    }
    return t ? fu(r ? t : t.sort(tr)) : Mr;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return Ae;
      case 1:
        return e[0];
      default:
        return new mn(e.every((t) => t instanceof se) ? e : e.reduce((t, r) => t.concat(r instanceof se ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let t = 0; t < this.members.length; t++)
      this.members[t].forEachSet(e);
  }
}
function IT(n, e, t, r, i, o, s) {
  let l = n.slice();
  for (let c = 0, u = o; c < t.maps.length; c++) {
    let d = 0;
    t.maps[c].forEach((h, f, p, m) => {
      let y = m - p - (f - h);
      for (let g = 0; g < l.length; g += 3) {
        let C = l[g + 1];
        if (C < 0 || h > C + u - d)
          continue;
        let x = l[g] + u - d;
        f >= x ? l[g + 1] = h <= x ? -2 : -1 : h >= u && y && (l[g] += y, l[g + 1] += y);
      }
      d += y;
    }), u = t.maps[c].map(u, -1);
  }
  let a = !1;
  for (let c = 0; c < l.length; c += 3)
    if (l[c + 1] < 0) {
      if (l[c + 1] == -2) {
        a = !0, l[c + 1] = -1;
        continue;
      }
      let u = t.map(n[c] + o), d = u - i;
      if (d < 0 || d >= r.content.size) {
        a = !0;
        continue;
      }
      let h = t.map(n[c + 1] + o, -1), f = h - i, { index: p, offset: m } = r.content.findIndex(d), y = r.maybeChild(p);
      if (y && m == d && m + y.nodeSize == f) {
        let g = l[c + 2].mapInner(t, y, u + 1, n[c] + o + 1, s);
        g != Ae ? (l[c] = d, l[c + 1] = f, l[c + 2] = g) : (l[c + 1] = -2, a = !0);
      } else
        a = !0;
    }
  if (a) {
    let c = AT(l, n, e, t, i, o, s), u = Ks(c, r, 0, s);
    e = u.local;
    for (let d = 0; d < l.length; d += 3)
      l[d + 1] < 0 && (l.splice(d, 3), d -= 3);
    for (let d = 0, h = 0; d < u.children.length; d += 3) {
      let f = u.children[d];
      for (; h < l.length && l[h] < f; )
        h += 3;
      l.splice(h, 0, u.children[d], u.children[d + 1], u.children[d + 2]);
    }
  }
  return new se(e.sort(tr), l);
}
function Lg(n, e) {
  if (!e || !n.length)
    return n;
  let t = [];
  for (let r = 0; r < n.length; r++) {
    let i = n[r];
    t.push(new Ce(i.from + e, i.to + e, i.type));
  }
  return t;
}
function AT(n, e, t, r, i, o, s) {
  function l(a, c) {
    for (let u = 0; u < a.local.length; u++) {
      let d = a.local[u].map(r, i, c);
      d ? t.push(d) : s.onRemove && s.onRemove(a.local[u].spec);
    }
    for (let u = 0; u < a.children.length; u += 3)
      l(a.children[u + 2], a.children[u] + c + 1);
  }
  for (let a = 0; a < n.length; a += 3)
    n[a + 1] == -1 && l(n[a + 2], e[a] + o + 1);
  return t;
}
function Pg(n, e, t) {
  if (e.isLeaf)
    return null;
  let r = t + e.nodeSize, i = null;
  for (let o = 0, s; o < n.length; o++)
    (s = n[o]) && s.from > t && s.to < r && ((i || (i = [])).push(s), n[o] = null);
  return i;
}
function Bg(n) {
  let e = [];
  for (let t = 0; t < n.length; t++)
    n[t] != null && e.push(n[t]);
  return e;
}
function Ks(n, e, t, r) {
  let i = [], o = !1;
  e.forEach((l, a) => {
    let c = Pg(n, l, a + t);
    if (c) {
      o = !0;
      let u = Ks(c, l, t + a + 1, r);
      u != Ae && i.push(a, a + l.nodeSize, u);
    }
  });
  let s = Lg(o ? Bg(n) : n, -t).sort(tr);
  for (let l = 0; l < s.length; l++)
    s[l].type.valid(e, s[l]) || (r.onRemove && r.onRemove(s[l].spec), s.splice(l--, 1));
  return s.length || i.length ? new se(s, i) : Ae;
}
function tr(n, e) {
  return n.from - e.from || n.to - e.to;
}
function fu(n) {
  let e = n;
  for (let t = 0; t < e.length - 1; t++) {
    let r = e[t];
    if (r.from != r.to)
      for (let i = t + 1; i < e.length; i++) {
        let o = e[i];
        if (o.from == r.from) {
          o.to != r.to && (e == n && (e = n.slice()), e[i] = o.copy(o.from, r.to), cf(e, i + 1, o.copy(r.to, o.to)));
          continue;
        } else {
          o.from < r.to && (e == n && (e = n.slice()), e[t] = r.copy(r.from, o.from), cf(e, i, r.copy(o.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function cf(n, e, t) {
  for (; e < n.length && tr(t, n[e]) > 0; )
    e++;
  n.splice(e, 0, t);
}
function ha(n) {
  let e = [];
  return n.someProp("decorations", (t) => {
    let r = t(n.state);
    r && r != Ae && e.push(r);
  }), n.cursorWrapper && e.push(se.create(n.state.doc, [n.cursorWrapper.deco])), mn.from(e);
}
const OT = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, RT = Ve && vn <= 11;
class DT {
  constructor() {
    this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
  }
  set(e) {
    this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
  }
  clear() {
    this.anchorNode = this.focusNode = null;
  }
  eq(e) {
    return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
  }
}
class LT {
  constructor(e, t) {
    this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new DT(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let i = 0; i < r.length; i++)
        this.queue.push(r[i]);
      Ve && vn <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : this.flush();
    }), RT && (this.onCharData = (r) => {
      this.queue.push({ target: r.target, type: "characterData", oldValue: r.prevValue }), this.flushSoon();
    }), this.onSelectionChange = this.onSelectionChange.bind(this);
  }
  flushSoon() {
    this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
      this.flushingSoon = -1, this.flush();
    }, 20));
  }
  forceFlush() {
    this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
  }
  start() {
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, OT)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
  }
  stop() {
    if (this.observer) {
      let e = this.observer.takeRecords();
      if (e.length) {
        for (let t = 0; t < e.length; t++)
          this.queue.push(e[t]);
        window.setTimeout(() => this.flush(), 20);
      }
      this.observer.disconnect();
    }
    this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
  }
  connectSelection() {
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
  }
  disconnectSelection() {
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
  }
  suppressSelectionUpdates() {
    this.suppressingSelectionUpdates = !0, setTimeout(() => this.suppressingSelectionUpdates = !1, 50);
  }
  onSelectionChange() {
    if (ef(this.view)) {
      if (this.suppressingSelectionUpdates)
        return tn(this.view);
      if (Ve && vn <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && cr(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
          return this.flushSoon();
      }
      this.flush();
    }
  }
  setCurSelection() {
    this.currentSelection.set(this.view.domSelectionRange());
  }
  ignoreSelectionChange(e) {
    if (!e.focusNode)
      return !0;
    let t = /* @__PURE__ */ new Set(), r;
    for (let o = e.focusNode; o; o = ti(o))
      t.add(o);
    for (let o = e.anchorNode; o; o = ti(o))
      if (t.has(o)) {
        r = o;
        break;
      }
    let i = r && this.view.docView.nearestDesc(r);
    if (i && i.ignoreMutation({
      type: "selection",
      target: r.nodeType == 3 ? r.parentNode : r
    }))
      return this.setCurSelection(), !0;
  }
  pendingRecords() {
    if (this.observer)
      for (let e of this.observer.takeRecords())
        this.queue.push(e);
    return this.queue;
  }
  flush() {
    let { view: e } = this;
    if (!e.docView || this.flushingSoon > -1)
      return;
    let t = this.pendingRecords();
    t.length && (this.queue = []);
    let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && ef(e) && !this.ignoreSelectionChange(r), o = -1, s = -1, l = !1, a = [];
    if (e.editable)
      for (let u = 0; u < t.length; u++) {
        let d = this.registerMutation(t[u], a);
        d && (o = o < 0 ? d.from : Math.min(d.from, o), s = s < 0 ? d.to : Math.max(d.to, s), d.typeOver && (l = !0));
      }
    if (ft && a.length) {
      let u = a.filter((d) => d.nodeName == "BR");
      if (u.length == 2) {
        let [d, h] = u;
        d.parentNode && d.parentNode.parentNode == h.parentNode ? h.remove() : d.remove();
      } else {
        let { focusNode: d } = this.currentSelection;
        for (let h of u) {
          let f = h.parentNode;
          f && f.nodeName == "LI" && (!d || $T(e, d) != f) && h.remove();
        }
      }
    }
    let c = null;
    o < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && pl(r) && (c = su(e)) && c.eq(U.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, tn(e), this.currentSelection.set(r), e.scrollToSelection()) : (o > -1 || i) && (o > -1 && (e.docView.markDirty(o, s), PT(e)), this.handleDOMChange(o, s, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || tn(e), this.currentSelection.set(r));
  }
  registerMutation(e, t) {
    if (t.indexOf(e.target) > -1)
      return null;
    let r = this.view.docView.nearestDesc(e.target);
    if (e.type == "attributes" && (r == this.view.docView || e.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !r || r.ignoreMutation(e))
      return null;
    if (e.type == "childList") {
      for (let u = 0; u < e.addedNodes.length; u++) {
        let d = e.addedNodes[u];
        t.push(d), d.nodeType == 3 && (this.lastChangedTextNode = d);
      }
      if (r.contentDOM && r.contentDOM != r.dom && !r.contentDOM.contains(e.target))
        return { from: r.posBefore, to: r.posAfter };
      let i = e.previousSibling, o = e.nextSibling;
      if (Ve && vn <= 11 && e.addedNodes.length)
        for (let u = 0; u < e.addedNodes.length; u++) {
          let { previousSibling: d, nextSibling: h } = e.addedNodes[u];
          (!d || Array.prototype.indexOf.call(e.addedNodes, d) < 0) && (i = d), (!h || Array.prototype.indexOf.call(e.addedNodes, h) < 0) && (o = h);
        }
      let s = i && i.parentNode == e.target ? Ne(i) + 1 : 0, l = r.localPosFromDOM(e.target, s, -1), a = o && o.parentNode == e.target ? Ne(o) : e.target.childNodes.length, c = r.localPosFromDOM(e.target, a, 1);
      return { from: l, to: c };
    } else return e.type == "attributes" ? { from: r.posAtStart - r.border, to: r.posAtEnd + r.border } : (this.lastChangedTextNode = e.target, {
      from: r.posAtStart,
      to: r.posAtEnd,
      // An event was generated for a text change that didn't change
      // any text. Mark the dom change to fall back to assuming the
      // selection was typed over with an identical value if it can't
      // find another change.
      typeOver: e.target.nodeValue == e.oldValue
    });
  }
}
let uf = /* @__PURE__ */ new WeakMap(), df = !1;
function PT(n) {
  if (!uf.has(n) && (uf.set(n, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(n.dom).whiteSpace) !== -1)) {
    if (n.requiresGeckoHackNode = ft, df)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), df = !0;
  }
}
function hf(n, e) {
  let t = e.startContainer, r = e.startOffset, i = e.endContainer, o = e.endOffset, s = n.domAtPos(n.state.selection.anchor);
  return cr(s.node, s.offset, i, o) && ([t, r, i, o] = [i, o, t, r]), { anchorNode: t, anchorOffset: r, focusNode: i, focusOffset: o };
}
function BT(n, e) {
  if (e.getComposedRanges) {
    let i = e.getComposedRanges(n.root)[0];
    if (i)
      return hf(n, i);
  }
  let t;
  function r(i) {
    i.preventDefault(), i.stopImmediatePropagation(), t = i.getTargetRanges()[0];
  }
  return n.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), n.dom.removeEventListener("beforeinput", r, !0), t ? hf(n, t) : null;
}
function $T(n, e) {
  for (let t = e.parentNode; t && t != n.dom; t = t.parentNode) {
    let r = n.docView.nearestDesc(t, !0);
    if (r && r.node.isBlock)
      return t;
  }
  return null;
}
function zT(n, e, t) {
  let { node: r, fromOffset: i, toOffset: o, from: s, to: l } = n.docView.parseRange(e, t), a = n.domSelectionRange(), c, u = a.anchorNode;
  if (u && n.dom.contains(u.nodeType == 1 ? u : u.parentNode) && (c = [{ node: u, offset: a.anchorOffset }], pl(a) || c.push({ node: a.focusNode, offset: a.focusOffset })), Re && n.input.lastKeyCode === 8)
    for (let y = o; y > i; y--) {
      let g = r.childNodes[y - 1], C = g.pmViewDesc;
      if (g.nodeName == "BR" && !C) {
        o = y;
        break;
      }
      if (!C || C.size)
        break;
    }
  let d = n.state.doc, h = n.someProp("domParser") || Qr.fromSchema(n.state.schema), f = d.resolve(s), p = null, m = h.parse(r, {
    topNode: f.parent,
    topMatch: f.parent.contentMatchAt(f.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: f.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: c,
    ruleFromNode: FT,
    context: f
  });
  if (c && c[0].pos != null) {
    let y = c[0].pos, g = c[1] && c[1].pos;
    g == null && (g = y), p = { anchor: y + s, head: g + s };
  }
  return { doc: m, sel: p, from: s, to: l };
}
function FT(n) {
  let e = n.pmViewDesc;
  if (e)
    return e.parseRule();
  if (n.nodeName == "BR" && n.parentNode) {
    if (Be && /^(ul|ol)$/i.test(n.parentNode.nodeName)) {
      let t = document.createElement("div");
      return t.appendChild(document.createElement("li")), { skip: t };
    } else if (n.parentNode.lastChild == n || Be && /^(tr|table)$/i.test(n.parentNode.nodeName))
      return { ignore: !0 };
  } else if (n.nodeName == "IMG" && n.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}
const _T = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function HT(n, e, t, r, i) {
  let o = n.input.compositionPendingChanges || (n.composing ? n.input.compositionID : 0);
  if (n.input.compositionPendingChanges = 0, e < 0) {
    let A = n.input.lastSelectionTime > Date.now() - 50 ? n.input.lastSelectionOrigin : null, B = su(n, A);
    if (B && !n.state.selection.eq(B)) {
      if (Re && en && n.input.lastKeyCode === 13 && Date.now() - 100 < n.input.lastKeyCodeTime && n.someProp("handleKeyDown", (S) => S(n, qn(13, "Enter"))))
        return;
      let H = n.state.tr.setSelection(B);
      A == "pointer" ? H.setMeta("pointer", !0) : A == "key" && H.scrollIntoView(), o && H.setMeta("composition", o), n.dispatch(H);
    }
    return;
  }
  let s = n.state.doc.resolve(e), l = s.sharedDepth(t);
  e = s.before(l + 1), t = n.state.doc.resolve(t).after(l + 1);
  let a = n.state.selection, c = zT(n, e, t), u = n.state.doc, d = u.slice(c.from, c.to), h, f;
  n.input.lastKeyCode === 8 && Date.now() - 100 < n.input.lastKeyCodeTime ? (h = n.state.selection.to, f = "end") : (h = n.state.selection.from, f = "start"), n.input.lastKeyCode = null;
  let p = VT(d.content, c.doc.content, c.from, h, f);
  if (p && n.input.domChangeCount++, (ni && n.input.lastIOSEnter > Date.now() - 225 || en) && i.some((A) => A.nodeType == 1 && !_T.test(A.nodeName)) && (!p || p.endA >= p.endB) && n.someProp("handleKeyDown", (A) => A(n, qn(13, "Enter")))) {
    n.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && a instanceof J && !a.empty && a.$head.sameParent(a.$anchor) && !n.composing && !(c.sel && c.sel.anchor != c.sel.head))
      p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (c.sel) {
        let A = ff(n, n.state.doc, c.sel);
        if (A && !A.eq(n.state.selection)) {
          let B = n.state.tr.setSelection(A);
          o && B.setMeta("composition", o), n.dispatch(B);
        }
      }
      return;
    }
  n.state.selection.from < n.state.selection.to && p.start == p.endB && n.state.selection instanceof J && (p.start > n.state.selection.from && p.start <= n.state.selection.from + 2 && n.state.selection.from >= c.from ? p.start = n.state.selection.from : p.endA < n.state.selection.to && p.endA >= n.state.selection.to - 2 && n.state.selection.to <= c.to && (p.endB += n.state.selection.to - p.endA, p.endA = n.state.selection.to)), Ve && vn <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > c.from && c.doc.textBetween(p.start - c.from - 1, p.start - c.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let m = c.doc.resolveNoCache(p.start - c.from), y = c.doc.resolveNoCache(p.endB - c.from), g = u.resolve(p.start), C = m.sameParent(y) && m.parent.inlineContent && g.end() >= p.endA;
  if ((ni && n.input.lastIOSEnter > Date.now() - 225 && (!C || i.some((A) => A.nodeName == "DIV" || A.nodeName == "P")) || !C && m.pos < c.doc.content.size && (!m.sameParent(y) || !m.parent.inlineContent) && m.pos < y.pos && !/\S/.test(c.doc.textBetween(m.pos, y.pos, "", ""))) && n.someProp("handleKeyDown", (A) => A(n, qn(13, "Enter")))) {
    n.input.lastIOSEnter = 0;
    return;
  }
  if (n.state.selection.anchor > p.start && jT(u, p.start, p.endA, m, y) && n.someProp("handleKeyDown", (A) => A(n, qn(8, "Backspace")))) {
    en && Re && n.domObserver.suppressSelectionUpdates();
    return;
  }
  Re && p.endB == p.start && (n.input.lastChromeDelete = Date.now()), en && !C && m.start() != y.start() && y.parentOffset == 0 && m.depth == y.depth && c.sel && c.sel.anchor == c.sel.head && c.sel.head == p.endA && (p.endB -= 2, y = c.doc.resolveNoCache(p.endB - c.from), setTimeout(() => {
    n.someProp("handleKeyDown", function(A) {
      return A(n, qn(13, "Enter"));
    });
  }, 20));
  let x = p.start, L = p.endA, D = (A) => {
    let B = A || n.state.tr.replace(x, L, c.doc.slice(p.start - c.from, p.endB - c.from));
    if (c.sel) {
      let H = ff(n, B.doc, c.sel);
      H && !(Re && n.composing && H.empty && (p.start != p.endB || n.input.lastChromeDelete < Date.now() - 100) && (H.head == x || H.head == B.mapping.map(L) - 1) || Ve && H.empty && H.head == x) && B.setSelection(H);
    }
    return o && B.setMeta("composition", o), B.scrollIntoView();
  }, w;
  if (C)
    if (m.pos == y.pos) {
      Ve && vn <= 11 && m.parentOffset == 0 && (n.domObserver.suppressSelectionUpdates(), setTimeout(() => tn(n), 20));
      let A = D(n.state.tr.delete(x, L)), B = u.resolve(p.start).marksAcross(u.resolve(p.endA));
      B && A.ensureMarks(B), n.dispatch(A);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (w = qT(m.parent.content.cut(m.parentOffset, y.parentOffset), g.parent.content.cut(g.parentOffset, p.endA - g.start())))
    ) {
      let A = D(n.state.tr);
      w.type == "add" ? A.addMark(x, L, w.mark) : A.removeMark(x, L, w.mark), n.dispatch(A);
    } else if (m.parent.child(m.index()).isText && m.index() == y.index() - (y.textOffset ? 0 : 1)) {
      let A = m.parent.textBetween(m.parentOffset, y.parentOffset), B = () => D(n.state.tr.insertText(A, x, L));
      n.someProp("handleTextInput", (H) => H(n, x, L, A, B)) || n.dispatch(B());
    } else
      n.dispatch(D());
  else
    n.dispatch(D());
}
function ff(n, e, t) {
  return Math.max(t.anchor, t.head) > e.content.size ? null : lu(n, e.resolve(t.anchor), e.resolve(t.head));
}
function qT(n, e) {
  let t = n.firstChild.marks, r = e.firstChild.marks, i = t, o = r, s, l, a;
  for (let u = 0; u < r.length; u++)
    i = r[u].removeFromSet(i);
  for (let u = 0; u < t.length; u++)
    o = t[u].removeFromSet(o);
  if (i.length == 1 && o.length == 0)
    l = i[0], s = "add", a = (u) => u.mark(l.addToSet(u.marks));
  else if (i.length == 0 && o.length == 1)
    l = o[0], s = "remove", a = (u) => u.mark(l.removeFromSet(u.marks));
  else
    return null;
  let c = [];
  for (let u = 0; u < e.childCount; u++)
    c.push(a(e.child(u)));
  if (N.from(c).eq(n))
    return { mark: l, type: s };
}
function jT(n, e, t, r, i) {
  if (
    // The content must have shrunk
    t - e <= i.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    fa(r, !0, !1) < i.pos
  )
    return !1;
  let o = n.resolve(e);
  if (!r.parent.isTextblock) {
    let l = o.nodeAfter;
    return l != null && t == e + l.nodeSize;
  }
  if (o.parentOffset < o.parent.content.size || !o.parent.isTextblock)
    return !1;
  let s = n.resolve(fa(o, !0, !0));
  return !s.parent.isTextblock || s.pos > t || fa(s, !0, !1) < t ? !1 : r.parent.content.cut(r.parentOffset).eq(s.parent.content);
}
function fa(n, e, t) {
  let r = n.depth, i = e ? n.end() : n.pos;
  for (; r > 0 && (e || n.indexAfter(r) == n.node(r).childCount); )
    r--, i++, e = !1;
  if (t) {
    let o = n.node(r).maybeChild(n.indexAfter(r));
    for (; o && !o.isLeaf; )
      o = o.firstChild, i++;
  }
  return i;
}
function VT(n, e, t, r, i) {
  let o = n.findDiffStart(e, t);
  if (o == null)
    return null;
  let { a: s, b: l } = n.findDiffEnd(e, t + n.size, t + e.size);
  if (i == "end") {
    let a = Math.max(0, o - Math.min(s, l));
    r -= s + a - o;
  }
  if (s < o && n.size < e.size) {
    let a = r <= o && r >= s ? o - r : 0;
    o -= a, o && o < e.size && pf(e.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), l = o + (l - s), s = o;
  } else if (l < o) {
    let a = r <= o && r >= l ? o - r : 0;
    o -= a, o && o < n.size && pf(n.textBetween(o - 1, o + 1)) && (o += a ? 1 : -1), s = o + (s - l), l = o;
  }
  return { start: o, endA: s, endB: l };
}
function pf(n) {
  if (n.length != 2)
    return !1;
  let e = n.charCodeAt(0), t = n.charCodeAt(1);
  return e >= 56320 && e <= 57343 && t >= 55296 && t <= 56319;
}
class $g {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, t) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new cT(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(kf), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = yf(this), gf(this), this.nodeViews = bf(this), this.docView = Jh(this.state.doc, mf(this), ha(this), this.dom, this), this.domObserver = new LT(this, (r, i, o, s) => HT(this, r, i, o, s)), this.domObserver.start(), uT(this), this.updatePluginViews();
  }
  /**
  Holds `true` when a
  [composition](https://w3c.github.io/uievents/#events-compositionevents)
  is active.
  */
  get composing() {
    return this.input.composing;
  }
  /**
  The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
  */
  get props() {
    if (this._props.state != this.state) {
      let e = this._props;
      this._props = {};
      for (let t in e)
        this._props[t] = e[t];
      this._props.state = this.state;
    }
    return this._props;
  }
  /**
  Update the view's props. Will immediately cause an update to
  the DOM.
  */
  update(e) {
    e.handleDOMEvents != this._props.handleDOMEvents && gc(this);
    let t = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(kf), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
  }
  /**
  Update the view by updating existing props object with the object
  given as argument. Equivalent to `view.update(Object.assign({},
  view.props, props))`.
  */
  setProps(e) {
    let t = {};
    for (let r in this._props)
      t[r] = this._props[r];
    t.state = this.state;
    for (let r in e)
      t[r] = e[r];
    this.update(t);
  }
  /**
  Update the editor's `state` prop, without touching any of the
  other props.
  */
  updateState(e) {
    this.updateStateInner(e, this._props);
  }
  updateStateInner(e, t) {
    var r;
    let i = this.state, o = !1, s = !1;
    e.storedMarks && this.composing && (Ag(this), s = !0), this.state = e;
    let l = i.plugins != e.plugins || this._props.plugins != t.plugins;
    if (l || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
      let f = bf(this);
      WT(f, this.nodeViews) && (this.nodeViews = f, o = !0);
    }
    (l || t.handleDOMEvents != this._props.handleDOMEvents) && gc(this), this.editable = yf(this), gf(this);
    let a = ha(this), c = mf(this), u = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", d = o || !this.docView.matchesNode(e.doc, c, a);
    (d || !e.selection.eq(i.selection)) && (s = !0);
    let h = u == "preserve" && s && this.dom.style.overflowAnchor == null && vM(this);
    if (s) {
      this.domObserver.stop();
      let f = d && (Ve || Re) && !this.composing && !i.selection.empty && !e.selection.empty && UT(i.selection, e.selection);
      if (d) {
        let p = Re ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = xT(this)), (o || !this.docView.update(e.doc, c, a, this)) && (this.docView.updateOuterDeco(c), this.docView.destroy(), this.docView = Jh(e.doc, c, a, this.dom, this)), p && !this.trackWrites && (f = !0);
      }
      f || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && JM(this)) ? tn(this, f) : (bg(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), u == "reset" ? this.dom.scrollTop = 0 : u == "to selection" ? this.scrollToSelection() : h && EM(h);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (t) => t(this))) if (this.state.selection instanceof q) {
        let t = this.docView.domAfterPos(this.state.selection.from);
        t.nodeType == 1 && qh(this, t.getBoundingClientRect(), e);
      } else
        qh(this, this.coordsAtPos(this.state.selection.head, 1), e);
    }
  }
  destroyPluginViews() {
    let e;
    for (; e = this.pluginViews.pop(); )
      e.destroy && e.destroy();
  }
  updatePluginViews(e) {
    if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
      this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
      for (let t = 0; t < this.directPlugins.length; t++) {
        let r = this.directPlugins[t];
        r.spec.view && this.pluginViews.push(r.spec.view(this));
      }
      for (let t = 0; t < this.state.plugins.length; t++) {
        let r = this.state.plugins[t];
        r.spec.view && this.pluginViews.push(r.spec.view(this));
      }
    } else
      for (let t = 0; t < this.pluginViews.length; t++) {
        let r = this.pluginViews[t];
        r.update && r.update(this, e);
      }
  }
  updateDraggedNode(e, t) {
    let r = e.node, i = -1;
    if (this.state.doc.nodeAt(r.from) == r.node)
      i = r.from;
    else {
      let o = r.from + (this.state.doc.content.size - t.doc.content.size);
      (o > 0 && this.state.doc.nodeAt(o)) == r.node && (i = o);
    }
    this.dragging = new Rg(e.slice, e.move, i < 0 ? void 0 : q.create(this.state.doc, i));
  }
  someProp(e, t) {
    let r = this._props && this._props[e], i;
    if (r != null && (i = t ? t(r) : r))
      return i;
    for (let s = 0; s < this.directPlugins.length; s++) {
      let l = this.directPlugins[s].props[e];
      if (l != null && (i = t ? t(l) : l))
        return i;
    }
    let o = this.state.plugins;
    if (o)
      for (let s = 0; s < o.length; s++) {
        let l = o[s].props[e];
        if (l != null && (i = t ? t(l) : l))
          return i;
      }
  }
  /**
  Query whether the view has focus.
  */
  hasFocus() {
    if (Ve) {
      let e = this.root.activeElement;
      if (e == this.dom)
        return !0;
      if (!e || !this.dom.contains(e))
        return !1;
      for (; e && this.dom != e && this.dom.contains(e); ) {
        if (e.contentEditable == "false")
          return !1;
        e = e.parentElement;
      }
      return !0;
    }
    return this.root.activeElement == this.dom;
  }
  /**
  Focus the editor.
  */
  focus() {
    this.domObserver.stop(), this.editable && MM(this.dom), tn(this), this.domObserver.start();
  }
  /**
  Get the document root in which the editor exists. This will
  usually be the top-level `document`, but might be a [shadow
  DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
  root if the editor is inside one.
  */
  get root() {
    let e = this._root;
    if (e == null) {
      for (let t = this.dom.parentNode; t; t = t.parentNode)
        if (t.nodeType == 9 || t.nodeType == 11 && t.host)
          return t.getSelection || (Object.getPrototypeOf(t).getSelection = () => t.ownerDocument.getSelection()), this._root = t;
    }
    return e || document;
  }
  /**
  When an existing editor view is moved to a new document or
  shadow tree, call this to make it recompute its root.
  */
  updateRoot() {
    this._root = null;
  }
  /**
  Given a pair of viewport coordinates, return the document
  position that corresponds to them. May return null if the given
  coordinates aren't inside of the editor. When an object is
  returned, its `pos` property is the position nearest to the
  coordinates, and its `inside` property holds the position of the
  inner node that the position falls inside of, or -1 if it is at
  the top level, not in any node.
  */
  posAtCoords(e) {
    return OM(this, e);
  }
  /**
  Returns the viewport rectangle at a given document position.
  `left` and `right` will be the same number, as this returns a
  flat cursor-ish rectangle. If the position is between two things
  that aren't directly adjacent, `side` determines which element
  is used. When < 0, the element before the position is used,
  otherwise the element after.
  */
  coordsAtPos(e, t = 1) {
    return ug(this, e, t);
  }
  /**
  Find the DOM position that corresponds to the given document
  position. When `side` is negative, find the position as close as
  possible to the content before the position. When positive,
  prefer positions close to the content after the position. When
  zero, prefer as shallow a position as possible.
  
  Note that you should **not** mutate the editor's internal DOM,
  only inspect it (and even that is usually not necessary).
  */
  domAtPos(e, t = 0) {
    return this.docView.domFromPos(e, t);
  }
  /**
  Find the DOM node that represents the document node after the
  given position. May return `null` when the position doesn't point
  in front of a node or if the node is inside an opaque node view.
  
  This is intended to be able to call things like
  `getBoundingClientRect` on that DOM node. Do **not** mutate the
  editor DOM directly, or add styling this way, since that will be
  immediately overriden by the editor as it redraws the node.
  */
  nodeDOM(e) {
    let t = this.docView.descAt(e);
    return t ? t.nodeDOM : null;
  }
  /**
  Find the document position that corresponds to a given DOM
  position. (Whenever possible, it is preferable to inspect the
  document structure directly, rather than poking around in the
  DOM, but sometimes—for example when interpreting an event
  target—you don't have a choice.)
  
  The `bias` parameter can be used to influence which side of a DOM
  node to use when the position is inside a leaf node.
  */
  posAtDOM(e, t, r = -1) {
    let i = this.docView.posFromDOM(e, t, r);
    if (i == null)
      throw new RangeError("DOM position not inside the editor");
    return i;
  }
  /**
  Find out whether the selection is at the end of a textblock when
  moving in a given direction. When, for example, given `"left"`,
  it will return true if moving left from the current cursor
  position would leave that position's parent textblock. Will apply
  to the view's current state by default, but it is possible to
  pass a different state.
  */
  endOfTextblock(e, t) {
    return BM(this, t || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, t) {
    return so(this, "", e, !1, t || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, t) {
    return so(this, e, null, !0, t || new ClipboardEvent("paste"));
  }
  /**
  Serialize the given slice as it would be if it was copied from
  this editor. Returns a DOM element that contains a
  representation of the slice as its children, a textual
  representation, and the transformed slice (which can be
  different from the given input due to hooks like
  [`transformCopied`](https://prosemirror.net/docs/ref/#view.EditorProps.transformCopied)).
  */
  serializeForClipboard(e) {
    return au(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (dT(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], ha(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, fM());
  }
  /**
  This is true when the view has been
  [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
  used anymore).
  */
  get isDestroyed() {
    return this.docView == null;
  }
  /**
  Used for testing.
  */
  dispatchEvent(e) {
    return fT(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? Be && this.root.nodeType === 11 && bM(this.dom.ownerDocument) == this.dom && BT(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
$g.prototype.dispatch = function(n) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, n) : this.updateState(this.state.apply(n));
};
function mf(n) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(n.editable), n.someProp("attributes", (t) => {
    if (typeof t == "function" && (t = t(n.state)), t)
      for (let r in t)
        r == "class" ? e.class += " " + t[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + t[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(t[r]));
  }), e.translate || (e.translate = "no"), [Ce.node(0, n.state.doc.content.size, e)];
}
function gf(n) {
  if (n.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), n.cursorWrapper = { dom: e, deco: Ce.widget(n.state.selection.from, e, { raw: !0, marks: n.markCursor }) };
  } else
    n.cursorWrapper = null;
}
function yf(n) {
  return !n.someProp("editable", (e) => e(n.state) === !1);
}
function UT(n, e) {
  let t = Math.min(n.$anchor.sharedDepth(n.head), e.$anchor.sharedDepth(e.head));
  return n.$anchor.start(t) != e.$anchor.start(t);
}
function bf(n) {
  let e = /* @__PURE__ */ Object.create(null);
  function t(r) {
    for (let i in r)
      Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
  }
  return n.someProp("nodeViews", t), n.someProp("markViews", t), e;
}
function WT(n, e) {
  let t = 0, r = 0;
  for (let i in n) {
    if (n[i] != e[i])
      return !0;
    t++;
  }
  for (let i in e)
    r++;
  return t != r;
}
function kf(n) {
  if (n.spec.state || n.spec.filterTransaction || n.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
function sn(n, e) {
  return n.meta = {
    package: "@milkdown/core",
    group: "System",
    ...e
  }, n;
}
const zg = {
  text: (n, e, t, r) => {
    const i = n.value;
    return /^[^*_\\]*\s+$/.test(i) ? i : t.safe(i, { ...r, encode: [] });
  },
  strong: (n, e, t, r) => {
    const i = n.marker || t.options.strong || "*", o = t.enter("strong"), s = t.createTracker(r);
    let l = s.move(i + i);
    return l += s.move(
      t.containerPhrasing(n, {
        before: l,
        after: i,
        ...s.current()
      })
    ), l += s.move(i + i), o(), l;
  },
  emphasis: (n, e, t, r) => {
    const i = n.marker || t.options.emphasis || "*", o = t.enter("emphasis"), s = t.createTracker(r);
    let l = s.move(i);
    return l += s.move(
      t.containerPhrasing(n, {
        before: l,
        after: i,
        ...s.current()
      })
    ), l += s.move(i), o(), l;
  }
}, nt = X({}, "editorView"), Pi = X({}, "editorState"), pa = X([], "initTimer"), wf = X({}, "editor"), ao = X([], "inputRules"), On = X([], "prosePlugins"), co = X(
  [],
  "remarkPlugins"
), yc = X([], "nodeView"), bc = X([], "markView"), nr = X(
  Xi().use(Qi).use(Za),
  "remark"
), Vi = X(
  {
    handlers: zg,
    encode: []
  },
  "remarkStringifyOptions"
), gs = Bt("ConfigReady");
function KT(n) {
  const e = (t) => (t.record(gs), async () => (await n(t), t.done(gs), () => {
    t.clearTimer(gs);
  }));
  return sn(e, {
    displayName: "Config"
  }), e;
}
const rr = Bt("InitReady");
function JT(n) {
  const e = (t) => (t.inject(wf, n).inject(On, []).inject(co, []).inject(ao, []).inject(yc, []).inject(bc, []).inject(Vi, {
    handlers: zg,
    encode: []
  }).inject(nr, Xi().use(Qi).use(Za)).inject(pa, [gs]).record(rr), async () => {
    await t.waitTimers(pa);
    const r = t.get(Vi);
    return t.set(
      nr,
      Xi().use(Qi).use(Za, r)
    ), t.done(rr), () => {
      t.remove(wf).remove(On).remove(co).remove(ao).remove(yc).remove(bc).remove(Vi).remove(nr).remove(pa).clearTimer(rr);
    };
  });
  return sn(e, {
    displayName: "Init"
  }), e;
}
const Ue = Bt("SchemaReady"), ma = X([], "schemaTimer"), nn = X({}, "schema"), Ui = X([], "nodes"), Wi = X([], "marks");
function Cf(n) {
  return {
    ...n,
    parseDOM: n.parseDOM?.map((e) => ({ priority: n.priority, ...e }))
  };
}
const Fg = (n) => (n.inject(nn, {}).inject(Ui, []).inject(Wi, []).inject(ma, [rr]).record(Ue), async () => {
  await n.waitTimers(ma);
  const e = n.get(nr), r = n.get(co).reduce(
    (l, a) => l.use(a.plugin, a.options),
    e
  );
  n.set(nr, r);
  const i = Object.fromEntries(
    n.get(Ui).map(([l, a]) => [l, Cf(a)])
  ), o = Object.fromEntries(
    n.get(Wi).map(([l, a]) => [l, Cf(a)])
  ), s = new jv({ nodes: i, marks: o });
  return n.set(nn, s), n.done(Ue), () => {
    n.remove(nn).remove(Ui).remove(Wi).remove(ma).clearTimer(Ue);
  };
});
sn(Fg, {
  displayName: "Schema"
});
var Kn, at;
class _g {
  constructor() {
    W(this, Kn);
    W(this, at);
    P(this, Kn, new cm()), P(this, at, null), this.setCtx = (e) => {
      P(this, at, e);
    }, this.chain = () => {
      if (v(this, at) == null) throw Yl();
      const e = v(this, at), t = [], r = this.get.bind(this), i = {
        run: () => {
          const s = li(...t), l = e.get(nt);
          return s(l.state, l.dispatch, l);
        },
        inline: (s) => (t.push(s), i),
        pipe: o.bind(this)
      };
      function o(s, l) {
        const a = r(s);
        return t.push(a(l)), i;
      }
      return i;
    };
  }
  get ctx() {
    return v(this, at);
  }
  /// Register a command into the manager.
  create(e, t) {
    const r = e.create(v(this, Kn).sliceMap);
    return r.set(t), r;
  }
  get(e) {
    return v(this, Kn).get(e).get();
  }
  remove(e) {
    return v(this, Kn).remove(e);
  }
  call(e, t) {
    if (v(this, at) == null) throw Yl();
    const i = this.get(e)(t), o = v(this, at).get(nt);
    return i(o.state, o.dispatch, o);
  }
  /// Call an inline command.
  inline(e) {
    if (v(this, at) == null) throw Yl();
    const t = v(this, at).get(nt);
    return e(t.state, t.dispatch, t);
  }
}
Kn = new WeakMap(), at = new WeakMap();
function GT(n = "cmdKey") {
  return X((() => () => !1), n);
}
const ne = X(new _g(), "commands"), ga = X([Ue], "commandsTimer"), Ki = Bt("CommandsReady"), Hg = (n) => {
  const e = new _g();
  return e.setCtx(n), n.inject(ne, e).inject(ga, [Ue]).record(Ki), async () => (await n.waitTimers(ga), n.done(Ki), () => {
    n.remove(ne).remove(ga).clearTimer(Ki);
  });
};
sn(Hg, {
  displayName: "Commands"
});
function YT(n) {
  const e = li(
    WE,
    Zc,
    TE,
    Gm
  );
  return n.Backspace = e, n;
}
var Jn, He;
class qg {
  constructor() {
    W(this, Jn);
    W(this, He);
    P(this, Jn, null), P(this, He, []), this.setCtx = (e) => {
      P(this, Jn, e);
    }, this.add = (e) => (v(this, He).push(e), () => {
      P(this, He, v(this, He).filter((t) => t !== e));
    }), this.addObjectKeymap = (e) => {
      const t = [];
      return Object.entries(e).forEach(([r, i]) => {
        if (typeof i == "function") {
          const o = {
            key: r,
            onRun: () => i
          };
          v(this, He).push(o), t.push(() => {
            P(this, He, v(this, He).filter((s) => s !== o));
          });
        } else
          v(this, He).push(i), t.push(() => {
            P(this, He, v(this, He).filter((o) => o !== i));
          });
      }), () => {
        t.forEach((r) => r());
      };
    }, this.addBaseKeymap = () => {
      const e = YT(VE);
      return this.addObjectKeymap(e);
    }, this.build = () => {
      const e = {};
      return v(this, He).forEach((r) => {
        e[r.key] = [...e[r.key] || [], r];
      }), Object.fromEntries(
        Object.entries(e).map(([r, i]) => {
          const o = i.sort(
            (l, a) => (a.priority ?? 50) - (l.priority ?? 50)
          );
          return [r, (l, a, c) => {
            const u = v(this, Jn);
            if (u == null) throw al();
            const d = o.map((f) => f.onRun(u));
            return li(...d)(l, a, c);
          }];
        })
      );
    };
  }
  get ctx() {
    return v(this, Jn);
  }
}
Jn = new WeakMap(), He = new WeakMap();
const Js = X(new qg(), "keymap"), ya = X([Ue], "keymapTimer"), Ji = Bt("KeymapReady"), XT = (n) => {
  const e = new qg();
  return e.setCtx(n), n.inject(Js, e).inject(ya, [Ue]).record(Ji), async () => (await n.waitTimers(ya), n.done(Ji), () => {
    n.remove(Js).remove(ya).clearTimer(Ji);
  });
}, ys = Bt("ParserReady"), jg = (() => {
  throw al();
}), bs = X(jg, "parser"), ba = X([], "parserTimer"), Vg = (n) => (n.inject(bs, jg).inject(ba, [Ue]).record(ys), async () => {
  await n.waitTimers(ba);
  const e = n.get(nr), t = n.get(nn);
  return n.set(bs, Xv.create(t, e)), n.done(ys), () => {
    n.remove(bs).remove(ba).clearTimer(ys);
  };
});
sn(Vg, {
  displayName: "Parser"
});
const Gi = Bt("SerializerReady"), ka = X(
  [],
  "serializerTimer"
), Ug = (() => {
  throw al();
}), ks = X(
  Ug,
  "serializer"
), Wg = (n) => (n.inject(ks, Ug).inject(ka, [Ue]).record(Gi), async () => {
  await n.waitTimers(ka);
  const e = n.get(nr), t = n.get(nn);
  return n.set(ks, Zv.create(t, e)), n.done(Gi), () => {
    n.remove(ks).remove(ka).clearTimer(Gi);
  };
});
sn(Wg, {
  displayName: "Serializer"
});
const ws = X("", "defaultValue"), wa = X(
  (n) => n,
  "stateOptions"
), Ca = X(
  [],
  "editorStateTimer"
), Cs = Bt("EditorStateReady");
function QT(n, e, t) {
  if (typeof n == "string") return e(n);
  if (n.type === "html")
    return Qr.fromSchema(t).parse(n.dom);
  if (n.type === "json")
    return ht.fromJSON(t, n.value);
  throw fv(n);
}
const ZT = new ge("MILKDOWN_STATE_TRACKER"), Kg = (n) => (n.inject(ws, "").inject(Pi, {}).inject(wa, (e) => e).inject(Ca, [
  ys,
  Gi,
  Ki,
  Ji
]).record(Cs), async () => {
  await n.waitTimers(Ca);
  const e = n.get(nn), t = n.get(bs), r = n.get(ao), i = n.get(wa), o = n.get(On), s = n.get(ws), l = QT(s, t, e), a = n.get(Js), c = a.addBaseKeymap(), u = [
    ...o,
    new xe({
      key: ZT,
      state: {
        init: () => {
        },
        apply: (f, p, m, y) => {
          n.set(Pi, y);
        }
      }
    }),
    QE({ rules: r }),
    hM(a.build())
  ];
  n.set(On, u);
  const d = i({
    schema: e,
    doc: l,
    plugins: u
  }), h = Or.create(d);
  return n.set(Pi, h), n.done(Cs), () => {
    c(), n.remove(ws).remove(Pi).remove(wa).remove(Ca).clearTimer(Cs);
  };
});
sn(Kg, {
  displayName: "EditorState"
});
const uo = X([], "pasteRule"), Sa = X([Ue], "pasteRuleTimer"), Ss = Bt("PasteRuleReady"), Jg = (n) => (n.inject(uo, []).inject(Sa, [Ue]).record(Ss), async () => (await n.waitTimers(Sa), n.done(Ss), () => {
  n.remove(uo).remove(Sa).clearTimer(Ss);
}));
sn(Jg, {
  displayName: "PasteRule"
});
const xs = Bt("EditorViewReady"), xa = X(
  [],
  "editorViewTimer"
), vs = X(
  {},
  "editorViewOptions"
), Es = X(null, "root"), kc = X(null, "rootDOM"), wc = X(
  {},
  "rootAttrs"
);
function eN(n, e) {
  const t = document.createElement("div");
  t.className = "milkdown", n.appendChild(t), e.set(kc, t);
  const r = e.get(wc);
  return Object.entries(r).forEach(
    ([i, o]) => t.setAttribute(i, o)
  ), t;
}
function tN(n) {
  n.classList.add("editor"), n.setAttribute("role", "textbox");
}
const nN = new ge("MILKDOWN_VIEW_CLEAR"), Gg = (n) => (n.inject(Es, document.body).inject(nt, {}).inject(vs, {}).inject(kc, null).inject(wc, {}).inject(xa, [Cs, Ss]).record(xs), async () => {
  await n.wait(rr);
  const e = n.get(Es) || document.body, t = typeof e == "string" ? document.querySelector(e) : e;
  n.update(On, (a) => [
    new xe({
      key: nN,
      view: (c) => {
        const u = t ? eN(t, n) : void 0;
        return (() => {
          if (u && t) {
            const h = c.dom;
            t.replaceChild(u, h), u.appendChild(h);
          }
        })(), {
          destroy: () => {
            u?.parentNode && u?.parentNode.replaceChild(c.dom, u), u?.remove();
          }
        };
      }
    }),
    ...a
  ]), await n.waitTimers(xa);
  const r = n.get(Pi), i = n.get(vs), o = Object.fromEntries(n.get(yc)), s = Object.fromEntries(n.get(bc)), l = new $g(t, {
    state: r,
    nodeViews: o,
    markViews: s,
    transformPasted: (a, c, u) => (n.get(uo).sort((d, h) => (h.priority ?? 50) - (d.priority ?? 50)).map((d) => d.run).forEach((d) => {
      a = d(a, c, u);
    }), a),
    ...i
  });
  return tN(l.dom), n.set(nt, l), n.done(xs), () => {
    l?.destroy(), n.remove(Es).remove(nt).remove(vs).remove(kc).remove(wc).remove(xa).clearTimer(xs);
  };
});
sn(Gg, {
  displayName: "EditorView"
});
var Gn, Xe, Yt, Jr, bo, ko, qe, Xt, Yn, wo, Xn, Gr, Co, kn, Yr;
const fd = class fd {
  constructor() {
    W(this, Gn);
    W(this, Xe);
    W(this, Yt);
    W(this, Jr);
    W(this, bo);
    W(this, ko);
    W(this, qe);
    W(this, Xt);
    W(this, Yn);
    W(this, wo);
    W(this, Xn);
    W(this, Gr);
    W(this, Co);
    W(this, kn);
    W(this, Yr);
    P(this, Gn, !1), P(this, Xe, "Idle"), P(this, Yt, []), P(this, Jr, () => {
    }), P(this, bo, new cm()), P(this, ko, new vv()), P(this, qe, /* @__PURE__ */ new Map()), P(this, Xt, /* @__PURE__ */ new Map()), P(this, Yn, new Ya(v(this, bo), v(this, ko))), P(this, wo, () => {
      const e = KT(async (r) => {
        await Promise.all(
          v(this, Yt).map((i) => Promise.resolve(i(r)))
        );
      }), t = [
        Fg,
        Vg,
        Wg,
        Hg,
        XT,
        Jg,
        Kg,
        Gg,
        JT(this),
        e
      ];
      v(this, Xn).call(this, t, v(this, Xt));
    }), P(this, Xn, (e, t) => {
      e.forEach((r) => {
        const i = v(this, Yn).produce(
          v(this, Gn) ? r.meta : void 0
        ), o = r(i);
        t.set(r, { ctx: i, handler: o, cleanup: void 0 });
      });
    }), P(this, Gr, (e, t = !1) => Promise.all(
      [e].flat().map(async (r) => {
        const o = v(this, qe).get(r)?.cleanup;
        return t ? v(this, qe).delete(r) : v(this, qe).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        }), typeof o == "function" ? o() : o;
      })
    )), P(this, Co, async () => {
      await Promise.all(
        [...v(this, Xt).entries()].map(async ([e, { cleanup: t }]) => typeof t == "function" ? t() : t)
      ), v(this, Xt).clear();
    }), P(this, kn, (e) => {
      P(this, Xe, e), v(this, Jr).call(this, e);
    }), P(this, Yr, (e) => [...e.entries()].map(async ([t, r]) => {
      const { ctx: i, handler: o } = r;
      if (!o) return;
      const s = await o();
      e.set(t, { ctx: i, handler: o, cleanup: s });
    })), this.enableInspector = (e = !0) => (P(this, Gn, e), this), this.onStatusChange = (e) => (P(this, Jr, e), this), this.config = (e) => (v(this, Yt).push(e), this), this.removeConfig = (e) => (P(this, Yt, v(this, Yt).filter((t) => t !== e)), this), this.use = (e) => {
      const t = [e].flat();
      return t.flat().forEach((r) => {
        v(this, qe).set(r, {
          ctx: void 0,
          handler: void 0,
          cleanup: void 0
        });
      }), v(this, Xe) === "Created" && v(this, Xn).call(this, t, v(this, qe)), this;
    }, this.remove = async (e) => v(this, Xe) === "OnCreate" ? (console.warn(
      "[Milkdown]: You are trying to remove plugins when the editor is creating, this is not recommended, please check your code."
    ), new Promise((t) => {
      setTimeout(() => {
        t(this.remove(e));
      }, 50);
    })) : (await v(this, Gr).call(this, [e].flat(), !0), this), this.create = async () => v(this, Xe) === "OnCreate" ? this : (v(this, Xe) === "Created" && await this.destroy(), v(this, kn).call(this, "OnCreate"), v(this, wo).call(this), v(this, Xn).call(this, [...v(this, qe).keys()], v(this, qe)), await Promise.all(
      [
        v(this, Yr).call(this, v(this, Xt)),
        v(this, Yr).call(this, v(this, qe))
      ].flat()
    ), v(this, kn).call(this, "Created"), this), this.destroy = async (e = !1) => v(this, Xe) === "Destroyed" || v(this, Xe) === "OnDestroy" ? this : v(this, Xe) === "OnCreate" ? new Promise((t) => {
      setTimeout(() => {
        t(this.destroy(e));
      }, 50);
    }) : (e && P(this, Yt, []), v(this, kn).call(this, "OnDestroy"), await v(this, Gr).call(this, [...v(this, qe).keys()], e), await v(this, Co).call(this), v(this, kn).call(this, "Destroyed"), this), this.action = (e) => e(v(this, Yn)), this.inspect = () => v(this, Gn) ? [...v(this, Xt).values(), ...v(this, qe).values()].map(({ ctx: e }) => e?.inspector?.read()).filter((e) => !!e) : (console.warn(
      "[Milkdown]: You are trying to collect inspection when inspector is disabled, please enable inspector by `editor.enableInspector()` first."
    ), []);
  }
  /// Create a new editor instance.
  static make() {
    return new fd();
  }
  /// Get the ctx of the editor.
  get ctx() {
    return v(this, Yn);
  }
  /// Get the status of the editor.
  get status() {
    return v(this, Xe);
  }
};
Gn = new WeakMap(), Xe = new WeakMap(), Yt = new WeakMap(), Jr = new WeakMap(), bo = new WeakMap(), ko = new WeakMap(), qe = new WeakMap(), Xt = new WeakMap(), Yn = new WeakMap(), wo = new WeakMap(), Xn = new WeakMap(), Gr = new WeakMap(), Co = new WeakMap(), kn = new WeakMap(), Yr = new WeakMap();
let Cc = fd;
function Yg(n) {
  var e, t, r = "";
  if (typeof n == "string" || typeof n == "number") r += n;
  else if (typeof n == "object") if (Array.isArray(n)) {
    var i = n.length;
    for (e = 0; e < i; e++) n[e] && (t = Yg(n[e])) && (r && (r += " "), r += t);
  } else for (t in n) n[t] && (r && (r += " "), r += t);
  return r;
}
function rN() {
  for (var n, e, t = 0, r = "", i = arguments.length; t < i; t++) (n = arguments[t]) && (e = Yg(n)) && (r && (r += " "), r += e);
  return r;
}
function iN(n) {
  n.update(vs, (e) => {
    const t = e.attributes;
    return {
      ...e,
      attributes: (r) => {
        const i = typeof t == "function" ? t(r) : t;
        return {
          ...i,
          class: rN(
            "prose dark:prose-invert",
            i?.class || "",
            "milkdown-theme-nord"
          )
        };
      }
    };
  });
}
function j(n, e) {
  const t = GT(n), r = (i) => async () => {
    r.key = t, await i.wait(Ki);
    const o = e(i);
    return i.get(ne).create(t, o), r.run = (s) => i.get(ne).call(n, s), () => {
      i.get(ne).remove(t);
    };
  };
  return r;
}
function Je(n) {
  const e = (t) => async () => {
    await t.wait(Ue);
    const r = n(t);
    return t.update(ao, (i) => [...i, r]), e.inputRule = r, () => {
      t.update(ao, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function oN(n) {
  const e = (t) => async () => {
    await t.wait(Ue);
    const r = n(t);
    return t.update(uo, (i) => [...i, r]), e.pasteRule = r, () => {
      t.update(uo, (i) => i.filter((o) => o !== r));
    };
  };
  return e;
}
function ai(n, e) {
  const t = (r) => async () => {
    const i = e(r);
    return r.update(Wi, (o) => [
      ...o.filter((s) => s[0] !== n),
      [n, i]
    ]), t.id = n, t.schema = i, () => {
      r.update(Wi, (o) => o.filter(([s]) => s !== n));
    };
  };
  return t.type = (r) => {
    const i = r.get(nn).marks[n];
    if (!i) throw wv(n);
    return i;
  }, t;
}
function pu(n, e) {
  const t = (r) => async () => {
    const i = e(r);
    return r.update(Ui, (o) => [
      ...o.filter((s) => s[0] !== n),
      [n, i]
    ]), t.id = n, t.schema = i, () => {
      r.update(Ui, (o) => o.filter(([s]) => s !== n));
    };
  };
  return t.type = (r) => {
    const i = r.get(nn).nodes[n];
    if (!i) throw kv(n);
    return i;
  }, t;
}
function ot(n) {
  let e;
  const t = (r) => async () => (await r.wait(Ue), e = n(r), r.update(On, (i) => [...i, e]), () => {
    r.update(On, (i) => i.filter((o) => o !== e));
  });
  return t.plugin = () => e, t.key = () => e.spec.key, t;
}
function sN(n) {
  const e = (t) => async () => {
    await t.wait(Ji);
    const r = t.get(Js), i = n(t), o = r.addObjectKeymap(i);
    return e.keymap = i, () => {
      o();
    };
  };
  return e;
}
function ln(n, e) {
  const t = X(n, e), r = (i) => (i.inject(t), () => () => {
    i.remove(t);
  });
  return r.key = t, r;
}
function ye(n, e) {
  const t = ln(e, n), r = pu(n, (o) => o.get(t.key)(o)), i = [t, r];
  return i.id = r.id, i.node = r, i.type = (o) => r.type(o), i.ctx = t, i.key = t.key, i.extendSchema = (o) => {
    const s = o(e);
    return ye(n, s);
  }, i;
}
function ci(n, e) {
  const t = ln(e, n), r = ai(n, (o) => o.get(t.key)(o)), i = [t, r];
  return i.id = r.id, i.mark = r, i.type = (o) => r.type(o), i.ctx = t, i.key = t.key, i.extendSchema = (o) => {
    const s = o(e);
    return ci(n, s);
  }, i;
}
function Fe(n, e) {
  const t = Object.fromEntries(
    Object.entries(e).map(
      ([s, { shortcuts: l, priority: a }]) => [s, { shortcuts: l, priority: a }]
    )
  ), r = ln(t, `${n}Keymap`), i = sN((s) => {
    const l = s.get(r.key), a = Object.entries(e).flatMap(
      ([c, { command: u }]) => {
        const d = l[c], h = [d.shortcuts].flat(), f = d.priority;
        return h.map(
          (p) => [
            p,
            {
              key: p,
              onRun: u,
              priority: f
            }
          ]
        );
      }
    );
    return Object.fromEntries(a);
  }), o = [r, i];
  return o.ctx = r, o.shortcuts = i, o.key = r.key, o.keymap = i.keymap, o;
}
const Mt = (n, e = () => ({})) => ln(e, `${n}Attr`), Io = (n, e = () => ({})) => ln(e, `${n}Attr`);
function Ln(n, e, t) {
  const r = ln({}, n), i = (s) => async () => {
    await s.wait(rr);
    const a = {
      plugin: e(s),
      options: s.get(r.key)
    };
    return s.update(co, (c) => [...c, a]), () => {
      s.update(co, (c) => c.filter((u) => u !== a));
    };
  }, o = [r, i];
  return o.id = n, o.plugin = i, o.options = r, o;
}
function lN(n, e) {
  return function(t, r) {
    let { $from: i, $to: o, node: s } = t.selection;
    if (s && s.isBlock || i.depth < 2 || !i.sameParent(o))
      return !1;
    let l = i.node(-1);
    if (l.type != n)
      return !1;
    if (i.parent.content.size == 0 && i.node(-1).childCount == i.indexAfter(-1)) {
      if (i.depth == 3 || i.node(-3).type != n || i.index(-2) != i.node(-2).childCount - 1)
        return !1;
      if (r) {
        let d = N.empty, h = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
        for (let g = i.depth - h; g >= i.depth - 3; g--)
          d = N.from(i.node(g).copy(d));
        let f = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
        d = d.append(N.from(n.createAndFill()));
        let p = i.before(i.depth - (h - 1)), m = t.tr.replace(p, i.after(-f), new R(d, 4 - h, 0)), y = -1;
        m.doc.nodesBetween(p, m.doc.content.size, (g, C) => {
          if (y > -1)
            return !1;
          g.isTextblock && g.content.size == 0 && (y = C + 1);
        }), y > -1 && m.setSelection(U.near(m.doc.resolve(y))), r(m.scrollIntoView());
      }
      return !0;
    }
    let a = o.pos == i.end() ? l.contentMatchAt(0).defaultType : null, c = t.tr.delete(i.pos, o.pos), u = a ? [null, { type: a }] : void 0;
    return Hi(c.doc, i.pos, 2, u) ? (r && r(c.split(i.pos, 2, u).scrollIntoView()), !0) : !1;
  };
}
function aN(n) {
  return function(e, t) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (s) => s.childCount > 0 && s.firstChild.type == n);
    return o ? t ? r.node(o.depth - 1).type == n ? cN(e, t, n, o) : uN(e, t, o) : !0 : !1;
  };
}
function cN(n, e, t, r) {
  let i = n.tr, o = r.end, s = r.$to.end(r.depth);
  o < s && (i.step(new De(o - 1, s, o, s, new R(N.from(t.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new ym(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
  const l = ul(r);
  if (l == null)
    return !1;
  i.lift(r, l);
  let a = i.doc.resolve(i.mapping.map(o, -1) - 1);
  return dl(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), !0;
}
function uN(n, e, t) {
  let r = n.tr, i = t.parent;
  for (let f = t.end, p = t.endIndex - 1, m = t.startIndex; p > m; p--)
    f -= i.child(p).nodeSize, r.delete(f - 1, f + 1);
  let o = r.doc.resolve(t.start), s = o.nodeAfter;
  if (r.mapping.map(t.end) != t.start + o.nodeAfter.nodeSize)
    return !1;
  let l = t.startIndex == 0, a = t.endIndex == i.childCount, c = o.node(-1), u = o.index(-1);
  if (!c.canReplace(u + (l ? 0 : 1), u + 1, s.content.append(a ? N.empty : N.from(i))))
    return !1;
  let d = o.pos, h = d + s.nodeSize;
  return r.step(new De(d - (l ? 1 : 0), h + (a ? 1 : 0), d + 1, h - 1, new R((l ? N.empty : N.from(i.copy(N.empty))).append(a ? N.empty : N.from(i.copy(N.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function dN(n) {
  return function(e, t) {
    let { $from: r, $to: i } = e.selection, o = r.blockRange(i, (c) => c.childCount > 0 && c.firstChild.type == n);
    if (!o)
      return !1;
    let s = o.startIndex;
    if (s == 0)
      return !1;
    let l = o.parent, a = l.child(s - 1);
    if (a.type != n)
      return !1;
    if (t) {
      let c = a.lastChild && a.lastChild.type == l.type, u = N.from(c ? n.create() : null), d = new R(N.from(n.create(null, N.from(l.type.create(null, u)))), c ? 3 : 1, 0), h = o.start, f = o.end;
      t(e.tr.step(new De(h - (c ? 3 : 1), f, h, f, d, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
function hN(n) {
  const e = /* @__PURE__ */ new Map();
  if (!n || !n.type)
    throw new Error("mdast-util-definitions expected node");
  return rn(n, "definition", function(r) {
    const i = Sf(r.identifier);
    i && !e.get(i) && e.set(i, r);
  }), t;
  function t(r) {
    const i = Sf(r);
    return e.get(i);
  }
}
function Sf(n) {
  return String(n || "").toUpperCase();
}
function fN() {
  return function(n) {
    const e = hN(n);
    rn(n, function(t, r, i) {
      if (t.type === "definition" && i !== void 0 && typeof r == "number")
        return i.children.splice(r, 1), [qa, r];
      if (t.type === "imageReference" || t.type === "linkReference") {
        const o = e(t.identifier);
        if (o && i && typeof r == "number")
          return i.children[r] = t.type === "imageReference" ? { type: "image", url: o.url, title: o.title, alt: t.alt } : {
            type: "link",
            url: o.url,
            title: o.title,
            children: t.children
          }, [qa, r];
      }
    });
  };
}
function Xg(n, e) {
  if (!(e.childCount >= 1 && e.lastChild?.type.name === "hardbreak")) {
    n.next(e.content);
    return;
  }
  const r = [];
  e.content.forEach((i, o, s) => {
    s !== e.childCount - 1 && r.push(i);
  }), n.next(N.fromArray(r));
}
function E(n, e) {
  return Object.assign(n, {
    meta: {
      package: "@milkdown/preset-commonmark",
      ...e
    }
  }), n;
}
const mu = Io("emphasis");
E(mu, {
  displayName: "Attr<emphasis>",
  group: "Emphasis"
});
const ui = ci("emphasis", (n) => ({
  attrs: {
    marker: {
      default: n.get(Vi).emphasis || "*",
      validate: "string"
    }
  },
  parseDOM: [
    { tag: "i" },
    { tag: "em" },
    { style: "font-style", getAttrs: (e) => e === "italic" }
  ],
  toDOM: (e) => ["em", n.get(mu.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "emphasis",
    runner: (e, t, r) => {
      e.openMark(r, { marker: t.marker }), e.next(t.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "emphasis",
    runner: (e, t) => {
      e.withMark(t, "emphasis", void 0, {
        marker: t.attrs.marker
      });
    }
  }
}));
E(ui.mark, {
  displayName: "MarkSchema<emphasis>",
  group: "Emphasis"
});
E(ui.ctx, {
  displayName: "MarkSchemaCtx<emphasis>",
  group: "Emphasis"
});
const yl = j("ToggleEmphasis", (n) => () => Qt(ui.type(n)));
E(yl, {
  displayName: "Command<toggleEmphasisCommand>",
  group: "Emphasis"
});
const Qg = Je((n) => Eo(/(?:^|[^*])\*([^*]+)\*$/, ui.type(n), {
  getAttr: () => ({
    marker: "*"
  }),
  updateCaptured: ({ fullMatch: e, start: t }) => e.startsWith("*") ? {} : { fullMatch: e.slice(1), start: t + 1 }
}));
E(Qg, {
  displayName: "InputRule<emphasis>|Star",
  group: "Emphasis"
});
const Zg = Je((n) => Eo(/\b_(?![_\s])(.*?[^_\s])_\b/, ui.type(n), {
  getAttr: () => ({
    marker: "_"
  }),
  updateCaptured: ({ fullMatch: e, start: t }) => e.startsWith("_") ? {} : { fullMatch: e.slice(1), start: t + 1 }
}));
E(Zg, {
  displayName: "InputRule<emphasis>|Underscore",
  group: "Emphasis"
});
const gu = Fe("emphasisKeymap", {
  ToggleEmphasis: {
    shortcuts: "Mod-i",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(yl.key);
    }
  }
});
E(gu.ctx, {
  displayName: "KeymapCtx<emphasis>",
  group: "Emphasis"
});
E(gu.shortcuts, {
  displayName: "Keymap<emphasis>",
  group: "Emphasis"
});
const yu = Io("strong");
E(yu, {
  displayName: "Attr<strong>",
  group: "Strong"
});
const Ao = ci("strong", (n) => ({
  attrs: {
    marker: {
      default: n.get(Vi).strong || "*",
      validate: "string"
    }
  },
  parseDOM: [
    // This works around a Google Docs misbehavior where
    // pasted content will be inexplicably wrapped in `<b>`
    // tags with a font-weight normal.
    {
      tag: "b",
      getAttrs: (e) => e.style.fontWeight != "normal" && null
    },
    { tag: "strong" },
    { style: "font-style", getAttrs: (e) => e === "bold" },
    { style: "font-weight=400", clearMark: (e) => e.type.name == "strong" },
    {
      style: "font-weight",
      getAttrs: (e) => /^(bold(er)?|[5-9]\d{2,})$/.test(e) && null
    }
  ],
  toDOM: (e) => ["strong", n.get(yu.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "strong",
    runner: (e, t, r) => {
      e.openMark(r, { marker: t.marker }), e.next(t.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "strong",
    runner: (e, t) => {
      e.withMark(t, "strong", void 0, {
        marker: t.attrs.marker
      });
    }
  }
}));
E(Ao.mark, {
  displayName: "MarkSchema<strong>",
  group: "Strong"
});
E(Ao.ctx, {
  displayName: "MarkSchemaCtx<strong>",
  group: "Strong"
});
const bl = j("ToggleStrong", (n) => () => Qt(Ao.type(n)));
E(bl, {
  displayName: "Command<toggleStrongCommand>",
  group: "Strong"
});
const ey = Je((n) => Eo(
  new RegExp("(?<![\\w:/])(?:\\*\\*|__)([^*_]+?)(?:\\*\\*|__)(?![\\w/])$"),
  Ao.type(n),
  {
    getAttr: (e) => ({
      marker: e[0].startsWith("*") ? "*" : "_"
    })
  }
));
E(ey, {
  displayName: "InputRule<strong>",
  group: "Strong"
});
const bu = Fe("strongKeymap", {
  ToggleBold: {
    shortcuts: ["Mod-b"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(bl.key);
    }
  }
});
E(bu.ctx, {
  displayName: "KeymapCtx<strong>",
  group: "Strong"
});
E(bu.shortcuts, {
  displayName: "Keymap<strong>",
  group: "Strong"
});
const ku = Io("inlineCode");
E(ku, {
  displayName: "Attr<inlineCode>",
  group: "InlineCode"
});
const Sn = ci("inlineCode", (n) => ({
  priority: 100,
  code: !0,
  parseDOM: [{ tag: "code" }],
  toDOM: (e) => ["code", n.get(ku.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "inlineCode",
    runner: (e, t, r) => {
      e.openMark(r), e.addText(t.value), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "inlineCode",
    runner: (e, t, r) => {
      e.withMark(t, "inlineCode", r.text || "");
    }
  }
}));
E(Sn.mark, {
  displayName: "MarkSchema<inlineCode>",
  group: "InlineCode"
});
E(Sn.ctx, {
  displayName: "MarkSchemaCtx<inlineCode>",
  group: "InlineCode"
});
const kl = j(
  "ToggleInlineCode",
  (n) => () => (e, t) => {
    const { selection: r, tr: i } = e;
    if (r.empty) return !1;
    const { from: o, to: s } = r;
    return e.doc.rangeHasMark(o, s, Sn.type(n)) ? (t?.(i.removeMark(o, s, Sn.type(n))), !0) : (Object.keys(e.schema.marks).filter(
      (c) => c !== Sn.type.name
    ).map((c) => e.schema.marks[c]).forEach((c) => {
      i.removeMark(o, s, c);
    }), t?.(i.addMark(o, s, Sn.type(n).create())), !0);
  }
);
E(kl, {
  displayName: "Command<toggleInlineCodeCommand>",
  group: "InlineCode"
});
const ty = Je((n) => Eo(/(?:`)([^`]+)(?:`)$/, Sn.type(n)));
E(ty, {
  displayName: "InputRule<inlineCodeInputRule>",
  group: "InlineCode"
});
const wu = Fe("inlineCodeKeymap", {
  ToggleInlineCode: {
    shortcuts: "Mod-e",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(kl.key);
    }
  }
});
E(wu.ctx, {
  displayName: "KeymapCtx<inlineCode>",
  group: "InlineCode"
});
E(wu.shortcuts, {
  displayName: "Keymap<inlineCode>",
  group: "InlineCode"
});
const Cu = Io("link");
E(Cu, {
  displayName: "Attr<link>",
  group: "Link"
});
const $r = ci("link", (n) => ({
  attrs: {
    href: { validate: "string" },
    title: { default: null, validate: "string|null" }
  },
  parseDOM: [
    {
      tag: "a[href]",
      getAttrs: (e) => {
        if (!(e instanceof HTMLElement)) throw Pt(e);
        return {
          href: e.getAttribute("href"),
          title: e.getAttribute("title")
        };
      }
    }
  ],
  toDOM: (e) => ["a", { ...n.get(Cu.key)(e), ...e.attrs }],
  parseMarkdown: {
    match: (e) => e.type === "link",
    runner: (e, t, r) => {
      const i = t.url, o = t.title;
      e.openMark(r, { href: i, title: o }), e.next(t.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "link",
    runner: (e, t) => {
      e.withMark(t, "link", void 0, {
        title: t.attrs.title,
        url: t.attrs.href
      });
    }
  }
}));
E($r.mark, {
  displayName: "MarkSchema<link>",
  group: "Link"
});
const ny = j(
  "ToggleLink",
  (n) => (e = {}) => Qt($r.type(n), e)
);
E(ny, {
  displayName: "Command<toggleLinkCommand>",
  group: "Link"
});
const ry = j(
  "UpdateLink",
  (n) => (e = {}) => (t, r) => {
    if (!r) return !1;
    let i, o = -1;
    const { selection: s } = t, { from: l, to: a } = s;
    if (t.doc.nodesBetween(l, l === a ? a + 1 : a, (p, m) => {
      if ($r.type(n).isInSet(p.marks))
        return i = p, o = m, !1;
    }), !i) return !1;
    const c = i.marks.find(({ type: p }) => p === $r.type(n));
    if (!c) return !1;
    const u = o, d = o + i.nodeSize, { tr: h } = t, f = $r.type(n).create({ ...c.attrs, ...e });
    return f ? (r(
      h.removeMark(u, d, c).addMark(u, d, f).setSelection(new J(h.selection.$anchor)).scrollIntoView()
    ), !0) : !1;
  }
);
E(ry, {
  displayName: "Command<updateLinkCommand>",
  group: "Link"
});
const iy = pu("doc", () => ({
  content: "block+",
  parseMarkdown: {
    match: ({ type: n }) => n === "root",
    runner: (n, e, t) => {
      n.injectRoot(e, t);
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "doc",
    runner: (n, e) => {
      n.openNode("root"), n.next(e.content);
    }
  }
}));
E(iy, {
  displayName: "NodeSchema<doc>",
  group: "Doc"
});
function pN(n) {
  return Pc(
    n,
    (e) => e.type === "html" && ["<br />", "<br>", "<br >", "<br/>"].includes(
      e.value?.trim()
    ),
    (e, t) => {
      if (!t.length) return;
      const r = t[t.length - 1];
      if (!r) return;
      const i = r.children.indexOf(e);
      i !== -1 && r.children.splice(i, 1);
    },
    !0
  );
}
const wl = Ln(
  "remark-preserve-empty-line",
  () => () => pN
);
E(wl.plugin, {
  displayName: "Remark<remarkPreserveEmptyLine>",
  group: "Remark"
});
E(wl.options, {
  displayName: "RemarkConfig<remarkPreserveEmptyLine>",
  group: "Remark"
});
const Su = Mt("paragraph");
E(Su, {
  displayName: "Attr<paragraph>",
  group: "Paragraph"
});
const an = ye("paragraph", (n) => ({
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM: (e) => ["p", n.get(Su.key)(e), 0],
  parseMarkdown: {
    match: (e) => e.type === "paragraph",
    runner: (e, t, r) => {
      e.openNode(r), t.children ? e.next(t.children) : e.addText(t.value || ""), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "paragraph",
    runner: (e, t) => {
      const i = n.get(nt).state?.doc.lastChild;
      e.openNode("paragraph"), (!t.content || t.content.size === 0) && t !== i && mN(n) ? e.addNode("html", void 0, "<br />") : Xg(e, t), e.closeNode();
    }
  }
}));
function mN(n) {
  let e = !1;
  try {
    n.get(wl.id), e = !0;
  } catch {
    e = !1;
  }
  return e;
}
E(an.node, {
  displayName: "NodeSchema<paragraph>",
  group: "Paragraph"
});
E(an.ctx, {
  displayName: "NodeSchemaCtx<paragraph>",
  group: "Paragraph"
});
const zr = j(
  "TurnIntoText",
  (n) => () => io(an.type(n))
);
E(zr, {
  displayName: "Command<turnIntoTextCommand>",
  group: "Paragraph"
});
const xu = Fe("paragraphKeymap", {
  TurnIntoText: {
    shortcuts: "Mod-Alt-0",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(zr.key);
    }
  }
});
E(xu.ctx, {
  displayName: "KeymapCtx<paragraph>",
  group: "Paragraph"
});
E(xu.shortcuts, {
  displayName: "Keymap<paragraph>",
  group: "Paragraph"
});
const gN = Array(6).fill(0).map((n, e) => e + 1);
function yN(n) {
  return n.textContent.toLowerCase().trim().replace(/\s+/g, "-");
}
const Cl = ln(
  yN,
  "headingIdGenerator"
);
E(Cl, {
  displayName: "Ctx<HeadingIdGenerator>",
  group: "Heading"
});
const vu = Mt("heading");
E(vu, {
  displayName: "Attr<heading>",
  group: "Heading"
});
const pr = ye("heading", (n) => {
  const e = n.get(Cl.key);
  return {
    content: "inline*",
    group: "block",
    defining: !0,
    attrs: {
      id: {
        default: "",
        validate: "string"
      },
      level: {
        default: 1,
        validate: "number"
      }
    },
    parseDOM: gN.map((t) => ({
      tag: `h${t}`,
      getAttrs: (r) => {
        if (!(r instanceof HTMLElement)) throw Pt(r);
        return { level: t, id: r.id };
      }
    })),
    toDOM: (t) => [
      `h${t.attrs.level}`,
      {
        ...n.get(vu.key)(t),
        id: t.attrs.id || e(t)
      },
      0
    ],
    parseMarkdown: {
      match: ({ type: t }) => t === "heading",
      runner: (t, r, i) => {
        const o = r.depth;
        t.openNode(i, { level: o }), t.next(r.children), t.closeNode();
      }
    },
    toMarkdown: {
      match: (t) => t.type.name === "heading",
      runner: (t, r) => {
        t.openNode("heading", void 0, { depth: r.attrs.level }), Xg(t, r), t.closeNode();
      }
    }
  };
});
E(pr.node, {
  displayName: "NodeSchema<heading>",
  group: "Heading"
});
E(pr.ctx, {
  displayName: "NodeSchemaCtx<heading>",
  group: "Heading"
});
const oy = Je((n) => eg(
  /^(?<hashes>#+)\s$/,
  pr.type(n),
  (e) => {
    const t = e.groups?.hashes?.length || 0, r = n.get(nt), { $from: i } = r.state.selection, o = i.node();
    if (o.type.name === "heading") {
      let s = Number(o.attrs.level) + Number(t);
      return s > 6 && (s = 6), { level: s };
    }
    return { level: t };
  }
));
E(oy, {
  displayName: "InputRule<wrapInHeadingInputRule>",
  group: "Heading"
});
const At = j("WrapInHeading", (n) => (e) => (e ?? (e = 1), e < 1 ? io(an.type(n)) : io(pr.type(n), { level: e })));
E(At, {
  displayName: "Command<wrapInHeadingCommand>",
  group: "Heading"
});
const Eu = j(
  "DowngradeHeading",
  (n) => () => (e, t, r) => {
    const { $from: i } = e.selection, o = i.node();
    if (o.type !== pr.type(n) || !e.selection.empty || i.parentOffset !== 0)
      return !1;
    const s = o.attrs.level - 1;
    return s ? (t?.(
      e.tr.setNodeMarkup(e.selection.$from.before(), void 0, {
        ...o.attrs,
        level: s
      })
    ), !0) : io(an.type(n))(e, t, r);
  }
);
E(Eu, {
  displayName: "Command<downgradeHeadingCommand>",
  group: "Heading"
});
const Mu = Fe("headingKeymap", {
  TurnIntoH1: {
    shortcuts: "Mod-Alt-1",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(At.key, 1);
    }
  },
  TurnIntoH2: {
    shortcuts: "Mod-Alt-2",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(At.key, 2);
    }
  },
  TurnIntoH3: {
    shortcuts: "Mod-Alt-3",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(At.key, 3);
    }
  },
  TurnIntoH4: {
    shortcuts: "Mod-Alt-4",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(At.key, 4);
    }
  },
  TurnIntoH5: {
    shortcuts: "Mod-Alt-5",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(At.key, 5);
    }
  },
  TurnIntoH6: {
    shortcuts: "Mod-Alt-6",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(At.key, 6);
    }
  },
  DowngradeHeading: {
    shortcuts: ["Delete", "Backspace"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Eu.key);
    }
  }
});
E(Mu.ctx, {
  displayName: "KeymapCtx<heading>",
  group: "Heading"
});
E(Mu.shortcuts, {
  displayName: "Keymap<heading>",
  group: "Heading"
});
const Tu = Mt("blockquote");
E(Tu, {
  displayName: "Attr<blockquote>",
  group: "Blockquote"
});
const Oo = ye(
  "blockquote",
  (n) => ({
    content: "block+",
    group: "block",
    defining: !0,
    parseDOM: [{ tag: "blockquote" }],
    toDOM: (e) => ["blockquote", n.get(Tu.key)(e), 0],
    parseMarkdown: {
      match: ({ type: e }) => e === "blockquote",
      runner: (e, t, r) => {
        e.openNode(r).next(t.children).closeNode();
      }
    },
    toMarkdown: {
      match: (e) => e.type.name === "blockquote",
      runner: (e, t) => {
        e.openNode("blockquote").next(t.content).closeNode();
      }
    }
  })
);
E(Oo.node, {
  displayName: "NodeSchema<blockquote>",
  group: "Blockquote"
});
E(Oo.ctx, {
  displayName: "NodeSchemaCtx<blockquote>",
  group: "Blockquote"
});
const sy = Je(
  (n) => ru(/^\s*>\s$/, Oo.type(n))
);
E(sy, {
  displayName: "InputRule<wrapInBlockquoteInputRule>",
  group: "Blockquote"
});
const Sl = j(
  "WrapInBlockquote",
  (n) => () => nu(Oo.type(n))
);
E(Sl, {
  displayName: "Command<wrapInBlockquoteCommand>",
  group: "Blockquote"
});
const Nu = Fe("blockquoteKeymap", {
  WrapInBlockquote: {
    shortcuts: "Mod-Shift-b",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Sl.key);
    }
  }
});
E(Nu.ctx, {
  displayName: "KeymapCtx<blockquote>",
  group: "Blockquote"
});
E(Nu.shortcuts, {
  displayName: "Keymap<blockquote>",
  group: "Blockquote"
});
const Iu = Mt("codeBlock", () => ({
  pre: {},
  code: {}
}));
E(Iu, {
  displayName: "Attr<codeBlock>",
  group: "CodeBlock"
});
const Ro = ye("code_block", (n) => ({
  content: "text*",
  group: "block",
  marks: "",
  defining: !0,
  code: !0,
  attrs: {
    language: {
      default: "",
      validate: "string"
    }
  },
  parseDOM: [
    {
      tag: "pre",
      preserveWhitespace: "full",
      getAttrs: (e) => {
        if (!(e instanceof HTMLElement)) throw Pt(e);
        return { language: e.dataset.language };
      }
    }
  ],
  toDOM: (e) => {
    const t = n.get(Iu.key)(e), r = e.attrs.language, i = r && r.length > 0 ? { "data-language": r } : void 0;
    return [
      "pre",
      {
        ...t.pre,
        ...i
      },
      ["code", t.code, 0]
    ];
  },
  parseMarkdown: {
    match: ({ type: e }) => e === "code",
    runner: (e, t, r) => {
      const i = t.lang ?? "", o = t.value;
      e.openNode(r, { language: i }), o && e.addText(o), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "code_block",
    runner: (e, t) => {
      e.addNode("code", void 0, t.content.firstChild?.text || "", {
        lang: t.attrs.language
      });
    }
  }
}));
E(Ro.node, {
  displayName: "NodeSchema<codeBlock>",
  group: "CodeBlock"
});
E(Ro.ctx, {
  displayName: "NodeSchemaCtx<codeBlock>",
  group: "CodeBlock"
});
const ly = Je(
  (n) => eg(
    /^```(?<language>[a-z]*)?[\s\n]$/,
    Ro.type(n),
    (e) => ({
      language: e.groups?.language ?? ""
    })
  )
);
E(ly, {
  displayName: "InputRule<createCodeBlockInputRule>",
  group: "CodeBlock"
});
const xl = j(
  "CreateCodeBlock",
  (n) => (e = "") => io(Ro.type(n), { language: e })
);
E(xl, {
  displayName: "Command<createCodeBlockCommand>",
  group: "CodeBlock"
});
const bN = j(
  "UpdateCodeBlockLanguage",
  () => ({ pos: n, language: e } = {
    pos: -1,
    language: ""
  }) => (t, r) => n >= 0 ? (r?.(t.tr.setNodeAttribute(n, "language", e)), !0) : !1
);
E(bN, {
  displayName: "Command<updateCodeBlockLanguageCommand>",
  group: "CodeBlock"
});
const Au = Fe("codeBlockKeymap", {
  CreateCodeBlock: {
    shortcuts: "Mod-Alt-c",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(xl.key);
    }
  }
});
E(Au.ctx, {
  displayName: "KeymapCtx<codeBlock>",
  group: "CodeBlock"
});
E(Au.shortcuts, {
  displayName: "Keymap<codeBlock>",
  group: "CodeBlock"
});
const Ou = Mt("image");
E(Ou, {
  displayName: "Attr<image>",
  group: "Image"
});
const di = ye("image", (n) => ({
  inline: !0,
  group: "inline",
  selectable: !0,
  draggable: !0,
  marks: "",
  atom: !0,
  defining: !0,
  isolating: !0,
  attrs: {
    src: { default: "", validate: "string" },
    alt: { default: "", validate: "string" },
    title: { default: "", validate: "string" }
  },
  parseDOM: [
    {
      tag: "img[src]",
      getAttrs: (e) => {
        if (!(e instanceof HTMLElement)) throw Pt(e);
        return {
          src: e.getAttribute("src") || "",
          alt: e.getAttribute("alt") || "",
          title: e.getAttribute("title") || e.getAttribute("alt") || ""
        };
      }
    }
  ],
  toDOM: (e) => ["img", { ...n.get(Ou.key)(e), ...e.attrs }],
  parseMarkdown: {
    match: ({ type: e }) => e === "image",
    runner: (e, t, r) => {
      const i = t.url, o = t.alt, s = t.title;
      e.addNode(r, {
        src: i,
        alt: o,
        title: s
      });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "image",
    runner: (e, t) => {
      e.addNode("image", void 0, void 0, {
        title: t.attrs.title,
        url: t.attrs.src,
        alt: t.attrs.alt
      });
    }
  }
}));
E(di.node, {
  displayName: "NodeSchema<image>",
  group: "Image"
});
E(di.ctx, {
  displayName: "NodeSchemaCtx<image>",
  group: "Image"
});
const ay = j(
  "InsertImage",
  (n) => (e = {}) => (t, r) => {
    if (!r) return !0;
    const { src: i = "", alt: o = "", title: s = "" } = e, l = di.type(n).create({ src: i, alt: o, title: s });
    return l && r(t.tr.replaceSelectionWith(l).scrollIntoView()), !0;
  }
);
E(ay, {
  displayName: "Command<insertImageCommand>",
  group: "Image"
});
const cy = j(
  "UpdateImage",
  (n) => (e = {}) => (t, r) => {
    const i = rM(
      t.selection,
      di.type(n)
    );
    if (!i) return !1;
    const { node: o, pos: s } = i, l = { ...o.attrs }, { src: a, alt: c, title: u } = e;
    return a !== void 0 && (l.src = a), c !== void 0 && (l.alt = c), u !== void 0 && (l.title = u), r?.(
      t.tr.setNodeMarkup(s, void 0, l).scrollIntoView()
    ), !0;
  }
);
E(cy, {
  displayName: "Command<updateImageCommand>",
  group: "Image"
});
const kN = Je(
  (n) => new it(
    /!\[(?<alt>.*?)]\((?<filename>.*?)\s*(?="|\))"?(?<title>[^"]+)?"?\)/,
    (e, t, r, i) => {
      const [o, s, l = "", a] = t;
      return o ? e.tr.replaceWith(
        r,
        i,
        di.type(n).create({ src: l, alt: s, title: a })
      ) : null;
    }
  )
);
E(kN, {
  displayName: "InputRule<insertImageInputRule>",
  group: "Image"
});
const Gs = Mt("hardbreak", (n) => ({
  "data-type": "hardbreak",
  "data-is-inline": n.attrs.isInline
}));
E(Gs, {
  displayName: "Attr<hardbreak>",
  group: "Hardbreak"
});
const ir = ye("hardbreak", (n) => ({
  inline: !0,
  group: "inline",
  attrs: {
    isInline: {
      default: !1,
      validate: "boolean"
    }
  },
  selectable: !1,
  parseDOM: [
    { tag: "br" },
    {
      tag: 'span[data-type="hardbreak"]',
      getAttrs: () => ({ isInline: !0 })
    }
  ],
  toDOM: (e) => e.attrs.isInline ? ["span", n.get(Gs.key)(e), " "] : ["br", n.get(Gs.key)(e)],
  parseMarkdown: {
    match: ({ type: e }) => e === "break",
    runner: (e, t, r) => {
      e.addNode(r, {
        isInline: !!t.data?.isInline
      });
    }
  },
  leafText: () => `
`,
  toMarkdown: {
    match: (e) => e.type.name === "hardbreak",
    runner: (e, t) => {
      t.attrs.isInline ? e.addNode("text", void 0, `
`) : e.addNode("break");
    }
  }
}));
E(ir.node, {
  displayName: "NodeSchema<hardbreak>",
  group: "Hardbreak"
});
E(ir.ctx, {
  displayName: "NodeSchemaCtx<hardbreak>",
  group: "Hardbreak"
});
const Ru = j(
  "InsertHardbreak",
  (n) => () => (e, t) => {
    const { selection: r, tr: i } = e;
    if (!(r instanceof J)) return !1;
    if (r.empty) {
      const o = r.$from.node();
      if (o.childCount > 0 && o.lastChild?.type.name === "hardbreak")
        return t?.(
          i.replaceRangeWith(
            r.to - 1,
            r.to,
            e.schema.node("paragraph")
          ).setSelection(U.near(i.doc.resolve(r.to))).scrollIntoView()
        ), !0;
    }
    return t?.(
      i.setMeta("hardbreak", !0).replaceSelectionWith(ir.type(n).create()).scrollIntoView()
    ), !0;
  }
);
E(Ru, {
  displayName: "Command<insertHardbreakCommand>",
  group: "Hardbreak"
});
const Du = Fe("hardbreakKeymap", {
  InsertHardbreak: {
    shortcuts: "Shift-Enter",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Ru.key);
    }
  }
});
E(Du.ctx, {
  displayName: "KeymapCtx<hardbreak>",
  group: "Hardbreak"
});
E(Du.shortcuts, {
  displayName: "Keymap<hardbreak>",
  group: "Hardbreak"
});
const Lu = Mt("hr");
E(Lu, {
  displayName: "Attr<hr>",
  group: "Hr"
});
const Do = ye("hr", (n) => ({
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM: (e) => ["hr", n.get(Lu.key)(e)],
  parseMarkdown: {
    match: ({ type: e }) => e === "thematicBreak",
    runner: (e, t, r) => {
      e.addNode(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "hr",
    runner: (e) => {
      e.addNode("thematicBreak");
    }
  }
}));
E(Do.node, {
  displayName: "NodeSchema<hr>",
  group: "Hr"
});
E(Do.ctx, {
  displayName: "NodeSchemaCtx<hr>",
  group: "Hr"
});
const uy = Je(
  (n) => new it(/^(?:---|___\s|\*\*\*\s)$/, (e, t, r, i) => {
    const { tr: o } = e;
    return t[0] && o.replaceWith(r - 1, i, Do.type(n).create()), o;
  })
);
E(uy, {
  displayName: "InputRule<insertHrInputRule>",
  group: "Hr"
});
const dy = j(
  "InsertHr",
  (n) => () => (e, t) => {
    if (!t) return !0;
    const r = an.node.type(n).create(), { tr: i, selection: o } = e, { from: s } = o, l = Do.type(n).create();
    if (!l) return !0;
    const a = i.replaceSelectionWith(l).insert(s, r), c = U.findFrom(a.doc.resolve(s), 1, !0);
    return c && t(a.setSelection(c).scrollIntoView()), !0;
  }
);
E(dy, {
  displayName: "Command<insertHrCommand>",
  group: "Hr"
});
const Pu = Mt("bulletList");
E(Pu, {
  displayName: "Attr<bulletList>",
  group: "BulletList"
});
const hi = ye("bullet_list", (n) => ({
  content: "listItem+",
  group: "block",
  attrs: {
    spread: {
      default: !1,
      validate: "boolean"
    }
  },
  parseDOM: [
    {
      tag: "ul",
      getAttrs: (e) => {
        if (!(e instanceof HTMLElement)) throw Pt(e);
        return {
          spread: e.dataset.spread === "true"
        };
      }
    }
  ],
  toDOM: (e) => [
    "ul",
    {
      ...n.get(Pu.key)(e),
      "data-spread": e.attrs.spread
    },
    0
  ],
  parseMarkdown: {
    match: ({ type: e, ordered: t }) => e === "list" && !t,
    runner: (e, t, r) => {
      const i = t.spread != null ? `${t.spread}` : "false";
      e.openNode(r, { spread: i }).next(t.children).closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "bullet_list",
    runner: (e, t) => {
      e.openNode("list", void 0, {
        ordered: !1,
        spread: t.attrs.spread
      }).next(t.content).closeNode();
    }
  }
}));
E(hi.node, {
  displayName: "NodeSchema<bulletList>",
  group: "BulletList"
});
E(hi.ctx, {
  displayName: "NodeSchemaCtx<bulletList>",
  group: "BulletList"
});
const hy = Je(
  (n) => ru(/^\s*([-+*])\s$/, hi.type(n))
);
E(hy, {
  displayName: "InputRule<wrapInBulletListInputRule>",
  group: "BulletList"
});
const vl = j(
  "WrapInBulletList",
  (n) => () => nu(hi.type(n))
);
E(vl, {
  displayName: "Command<wrapInBulletListCommand>",
  group: "BulletList"
});
const Bu = Fe("bulletListKeymap", {
  WrapInBulletList: {
    shortcuts: "Mod-Alt-8",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(vl.key);
    }
  }
});
E(Bu.ctx, {
  displayName: "KeymapCtx<bulletListKeymap>",
  group: "BulletList"
});
E(Bu.shortcuts, {
  displayName: "Keymap<bulletListKeymap>",
  group: "BulletList"
});
const $u = Mt("orderedList");
E($u, {
  displayName: "Attr<orderedList>",
  group: "OrderedList"
});
const fi = ye("ordered_list", (n) => ({
  content: "listItem+",
  group: "block",
  attrs: {
    order: {
      default: 1,
      validate: "number"
    },
    spread: {
      default: !1,
      validate: "boolean"
    }
  },
  parseDOM: [
    {
      tag: "ol",
      getAttrs: (e) => {
        if (!(e instanceof HTMLElement)) throw Pt(e);
        return {
          spread: e.dataset.spread,
          order: e.hasAttribute("start") ? Number(e.getAttribute("start")) : 1
        };
      }
    }
  ],
  toDOM: (e) => [
    "ol",
    {
      ...n.get($u.key)(e),
      ...e.attrs.order === 1 ? {} : e.attrs.order,
      "data-spread": e.attrs.spread
    },
    0
  ],
  parseMarkdown: {
    match: ({ type: e, ordered: t }) => e === "list" && !!t,
    runner: (e, t, r) => {
      const i = t.spread != null ? `${t.spread}` : "true";
      e.openNode(r, { spread: i }).next(t.children).closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "ordered_list",
    runner: (e, t) => {
      e.openNode("list", void 0, {
        ordered: !0,
        start: 1,
        spread: t.attrs.spread === "true"
      }), e.next(t.content), e.closeNode();
    }
  }
}));
E(fi.node, {
  displayName: "NodeSchema<orderedList>",
  group: "OrderedList"
});
E(fi.ctx, {
  displayName: "NodeSchemaCtx<orderedList>",
  group: "OrderedList"
});
const fy = Je(
  (n) => ru(
    /^\s*(\d+)\.\s$/,
    fi.type(n),
    (e) => ({ order: Number(e[1]) }),
    (e, t) => t.childCount + t.attrs.order === Number(e[1])
  )
);
E(fy, {
  displayName: "InputRule<wrapInOrderedListInputRule>",
  group: "OrderedList"
});
const El = j(
  "WrapInOrderedList",
  (n) => () => nu(fi.type(n))
);
E(El, {
  displayName: "Command<wrapInOrderedListCommand>",
  group: "OrderedList"
});
const zu = Fe("orderedListKeymap", {
  WrapInOrderedList: {
    shortcuts: "Mod-Alt-7",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(El.key);
    }
  }
});
E(zu.ctx, {
  displayName: "KeymapCtx<orderedList>",
  group: "OrderedList"
});
E(zu.shortcuts, {
  displayName: "Keymap<orderedList>",
  group: "OrderedList"
});
const Fu = Mt("listItem");
E(Fu, {
  displayName: "Attr<listItem>",
  group: "ListItem"
});
const cn = ye("list_item", (n) => ({
  group: "listItem",
  content: "paragraph block*",
  attrs: {
    label: {
      default: "•",
      validate: "string"
    },
    listType: {
      default: "bullet",
      validate: "string"
    },
    spread: {
      default: !0,
      validate: "boolean"
    }
  },
  defining: !0,
  parseDOM: [
    {
      tag: "li",
      getAttrs: (e) => {
        if (!(e instanceof HTMLElement)) throw Pt(e);
        return {
          label: e.dataset.label,
          listType: e.dataset.listType,
          spread: e.dataset.spread === "true"
        };
      }
    }
  ],
  toDOM: (e) => [
    "li",
    {
      ...n.get(Fu.key)(e),
      "data-label": e.attrs.label,
      "data-list-type": e.attrs.listType,
      "data-spread": e.attrs.spread
    },
    0
  ],
  parseMarkdown: {
    match: ({ type: e }) => e === "listItem",
    runner: (e, t, r) => {
      const i = t.label != null ? `${t.label}.` : "•", o = t.label != null ? "ordered" : "bullet", s = t.spread != null ? `${t.spread}` : "true";
      e.openNode(r, { label: i, listType: o, spread: s }), e.next(t.children), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "list_item",
    runner: (e, t) => {
      e.openNode("listItem", void 0, {
        spread: t.attrs.spread
      }), e.next(t.content), e.closeNode();
    }
  }
}));
E(cn.node, {
  displayName: "NodeSchema<listItem>",
  group: "ListItem"
});
E(cn.ctx, {
  displayName: "NodeSchemaCtx<listItem>",
  group: "ListItem"
});
const _u = j(
  "SinkListItem",
  (n) => () => dN(cn.type(n))
);
E(_u, {
  displayName: "Command<sinkListItemCommand>",
  group: "ListItem"
});
const ho = j(
  "LiftListItem",
  (n) => () => aN(cn.type(n))
);
E(ho, {
  displayName: "Command<liftListItemCommand>",
  group: "ListItem"
});
const Hu = j(
  "SplitListItem",
  (n) => () => lN(cn.type(n))
);
E(Hu, {
  displayName: "Command<splitListItemCommand>",
  group: "ListItem"
});
function wN(n) {
  return (e, t, r) => {
    const { selection: i } = e;
    if (!(i instanceof J)) return !1;
    const { empty: o, $from: s } = i;
    return !o || s.parentOffset !== 0 || s.node(-1).type !== cn.type(n) ? !1 : Jm(e, t, r);
  };
}
const qu = j(
  "LiftFirstListItem",
  (n) => () => wN(n)
);
E(qu, {
  displayName: "Command<liftFirstListItemCommand>",
  group: "ListItem"
});
const ju = Fe("listItemKeymap", {
  NextListItem: {
    shortcuts: "Enter",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Hu.key);
    }
  },
  SinkListItem: {
    shortcuts: ["Tab", "Mod-]"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(_u.key);
    }
  },
  LiftListItem: {
    shortcuts: ["Shift-Tab", "Mod-["],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(ho.key);
    }
  },
  LiftFirstListItem: {
    shortcuts: ["Backspace", "Delete"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(qu.key);
    }
  }
});
E(ju.ctx, {
  displayName: "KeymapCtx<listItem>",
  group: "ListItem"
});
E(ju.shortcuts, {
  displayName: "Keymap<listItem>",
  group: "ListItem"
});
const py = pu("text", () => ({
  group: "inline",
  parseMarkdown: {
    match: ({ type: n }) => n === "text",
    runner: (n, e) => {
      n.addText(e.value);
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "text",
    runner: (n, e) => {
      n.addNode("text", void 0, e.text);
    }
  }
}));
E(py, {
  displayName: "NodeSchema<text>",
  group: "Text"
});
const Vu = Mt("html");
E(Vu, {
  displayName: "Attr<html>",
  group: "Html"
});
const Uu = ye("html", (n) => ({
  atom: !0,
  group: "inline",
  inline: !0,
  attrs: {
    value: {
      default: "",
      validate: "string"
    }
  },
  toDOM: (e) => {
    const t = document.createElement("span"), r = {
      ...n.get(Vu.key)(e),
      "data-value": e.attrs.value,
      "data-type": "html"
    };
    return t.textContent = e.attrs.value, ["span", r, e.attrs.value];
  },
  parseDOM: [
    {
      tag: 'span[data-type="html"]',
      getAttrs: (e) => ({
        value: e.dataset.value ?? ""
      })
    }
  ],
  parseMarkdown: {
    match: ({ type: e }) => e === "html",
    runner: (e, t, r) => {
      e.addNode(r, { value: t.value });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "html",
    runner: (e, t) => {
      e.addNode("html", void 0, t.attrs.value);
    }
  }
}));
E(Uu.node, {
  displayName: "NodeSchema<html>",
  group: "Html"
});
E(Uu.ctx, {
  displayName: "NodeSchemaCtx<html>",
  group: "Html"
});
const CN = [
  iy,
  Su,
  an,
  Cl,
  vu,
  pr,
  Gs,
  ir,
  Tu,
  Oo,
  Iu,
  Ro,
  Lu,
  Do,
  Ou,
  di,
  Pu,
  hi,
  $u,
  fi,
  Fu,
  cn,
  mu,
  ui,
  yu,
  Ao,
  ku,
  Sn,
  Cu,
  $r,
  Vu,
  Uu,
  py
].flat(), SN = [
  sy,
  hy,
  fy,
  ly,
  uy,
  oy
].flat(), xN = [
  Qg,
  Zg,
  ty,
  ey
], vN = j(
  "IsMarkSelected",
  () => (n) => (e) => {
    if (!n) return !1;
    const { doc: t, selection: r } = e;
    return t.rangeHasMark(r.from, r.to, n);
  }
), EN = j(
  "IsNoteSelected",
  () => (n) => (e) => n ? iM(e, n).hasNode : !1
), MN = j(
  "ClearTextInCurrentBlock",
  () => () => (n, e) => {
    let t = n.tr;
    const { $from: r, $to: i } = t.selection, { pos: o } = r, { pos: s } = i, l = o - r.node().content.size;
    return l < 0 ? !1 : (t = t.deleteRange(l, s), e?.(t), !0);
  }
), TN = j(
  "SetBlockType",
  () => (n) => (e, t) => {
    const { nodeType: r, attrs: i = null } = n ?? {};
    if (!r) return !1;
    const o = e.tr, { from: s, to: l } = o.selection;
    try {
      o.setBlockType(s, l, r, i);
    } catch {
      return !1;
    }
    return t?.(o), !0;
  }
), NN = j(
  "WrapInBlockType",
  () => (n) => (e, t) => {
    const { nodeType: r, attrs: i = null } = n ?? {};
    if (!r) return !1;
    let o = e.tr;
    try {
      const { $from: s, $to: l } = o.selection, a = s.blockRange(l), c = a && Xc(a, r, i);
      if (!c) return !1;
      o = o.wrap(a, c);
    } catch {
      return !1;
    }
    return t?.(o), !0;
  }
), IN = j(
  "AddBlockType",
  () => (n) => (e, t) => {
    const { nodeType: r, attrs: i = null } = n ?? {};
    if (!r) return !1;
    const o = e.tr;
    try {
      const s = r instanceof ht ? r : r.createAndFill(i);
      if (!s) return !1;
      o.replaceSelectionWith(s);
    } catch {
      return !1;
    }
    return t?.(o), !0;
  }
), AN = j(
  "SelectTextNearPos",
  () => (n) => (e, t) => {
    const { pos: r } = n ?? {};
    if (r == null) return !1;
    const i = (s, l, a) => Math.min(Math.max(s, l), a), o = e.tr;
    try {
      const s = e.doc.resolve(i(r, 0, e.doc.content.size));
      o.setSelection(J.near(s));
    } catch {
      return !1;
    }
    return t?.(o.scrollIntoView()), !0;
  }
), ON = [
  zr,
  Sl,
  At,
  Eu,
  xl,
  Ru,
  dy,
  ay,
  cy,
  El,
  vl,
  _u,
  Hu,
  ho,
  qu,
  yl,
  kl,
  bl,
  ny,
  ry,
  vN,
  EN,
  MN,
  TN,
  NN,
  IN,
  AN
], RN = [
  Nu,
  Au,
  Du,
  Mu,
  ju,
  zu,
  Bu,
  xu,
  gu,
  wu,
  bu
].flat(), Wu = Ln(
  "remarkAddOrderInList",
  () => () => (n) => {
    rn(n, "list", (e) => {
      if (e.ordered) {
        const t = e.start ?? 1;
        e.children.forEach((r, i) => {
          r.label = i + t;
        });
      }
    });
  }
);
E(Wu.plugin, {
  displayName: "Remark<remarkAddOrderInListPlugin>",
  group: "Remark"
});
E(Wu.options, {
  displayName: "RemarkConfig<remarkAddOrderInListPlugin>",
  group: "Remark"
});
const Ku = Ln(
  "remarkLineBreak",
  () => () => (n) => {
    const e = /[\t ]*(?:\r?\n|\r)/g;
    rn(
      n,
      "text",
      (t, r, i) => {
        if (!t.value || typeof t.value != "string") return;
        const o = [];
        let s = 0;
        e.lastIndex = 0;
        let l = e.exec(t.value);
        for (; l; ) {
          const c = l.index;
          s !== c && o.push({
            type: "text",
            value: t.value.slice(s, c)
          }), o.push({ type: "break", data: { isInline: !0 } }), s = c + l[0].length, l = e.exec(t.value);
        }
        if (o.length > 0 && i && typeof r == "number")
          return s < t.value.length && o.push({ type: "text", value: t.value.slice(s) }), i.children.splice(r, 1, ...o), r + o.length;
      }
    );
  }
);
E(Ku.plugin, {
  displayName: "Remark<remarkLineBreak>",
  group: "Remark"
});
E(Ku.options, {
  displayName: "RemarkConfig<remarkLineBreak>",
  group: "Remark"
});
const Ju = Ln(
  "remarkInlineLink",
  () => fN
);
E(Ju.plugin, {
  displayName: "Remark<remarkInlineLinkPlugin>",
  group: "Remark"
});
E(Ju.options, {
  displayName: "RemarkConfig<remarkInlineLinkPlugin>",
  group: "Remark"
});
const DN = (n) => !!n.children, LN = (n) => n.type === "html";
function PN(n, e) {
  return t(n, 0, null)[0];
  function t(r, i, o) {
    if (DN(r)) {
      const s = [];
      for (let l = 0, a = r.children.length; l < a; l++) {
        const c = r.children[l];
        if (c) {
          const u = t(c, l, r);
          if (u)
            for (let d = 0, h = u.length; d < h; d++) {
              const f = u[d];
              f && s.push(f);
            }
        }
      }
      r.children = s;
    }
    return e(r, i, o);
  }
}
const BN = ["root", "blockquote", "listItem"], Gu = Ln(
  "remarkHTMLTransformer",
  () => () => (n) => {
    PN(n, (e, t, r) => LN(e) ? (r && BN.includes(r.type) && (e.children = [{ ...e }], delete e.value, e.type = "paragraph"), [e]) : [e]);
  }
);
E(Gu.plugin, {
  displayName: "Remark<remarkHtmlTransformer>",
  group: "Remark"
});
E(Gu.options, {
  displayName: "RemarkConfig<remarkHtmlTransformer>",
  group: "Remark"
});
const Yu = Ln(
  "remarkMarker",
  () => () => (n, e) => {
    const t = (r) => e.value.charAt(r.position.start.offset);
    rn(
      n,
      (r) => ["strong", "emphasis"].includes(r.type),
      (r) => {
        r.marker = t(r);
      }
    );
  }
);
E(Yu.plugin, {
  displayName: "Remark<remarkMarker>",
  group: "Remark"
});
E(Yu.options, {
  displayName: "RemarkConfig<remarkMarker>",
  group: "Remark"
});
const my = ot(() => {
  let n = !1;
  const e = new ge(
    "MILKDOWN_INLINE_NODES_CURSOR"
  ), t = new xe({
    key: e,
    state: {
      init() {
        return !1;
      },
      apply(r) {
        if (!r.selection.empty) return !1;
        const i = r.selection.$from, o = i.nodeBefore, s = i.nodeAfter;
        return !!(o && s && o.isInline && !o.isText && s.isInline && !s.isText);
      }
    },
    props: {
      handleDOMEvents: {
        compositionend: (r, i) => n ? (n = !1, requestAnimationFrame(() => {
          if (t.getState(r.state)) {
            const s = r.state.selection.from;
            i.preventDefault(), r.dispatch(r.state.tr.insertText(i.data || "", s));
          }
        }), !0) : !1,
        compositionstart: (r) => (t.getState(r.state) && (n = !0), !1),
        beforeinput: (r, i) => {
          if (t.getState(r.state) && i instanceof InputEvent && i.data && !n) {
            const s = r.state.selection.from;
            return i.preventDefault(), r.dispatch(r.state.tr.insertText(i.data || "", s)), !0;
          }
          return !1;
        }
      },
      decorations(r) {
        if (t.getState(r)) {
          const s = r.selection.$from.pos, l = document.createElement("span"), a = Ce.widget(s, l, {
            side: -1
          }), c = document.createElement("span"), u = Ce.widget(s, c);
          return setTimeout(() => {
            l.contentEditable = "true", c.contentEditable = "true";
          }), se.create(r.doc, [a, u]);
        }
        return se.empty;
      }
    }
  });
  return t;
});
E(my, {
  displayName: "Prose<inlineNodesCursorPlugin>",
  group: "Prose"
});
const gy = ot((n) => new xe({
  key: new ge("MILKDOWN_HARDBREAK_MARKS"),
  appendTransaction: (e, t, r) => {
    if (!e.length) return;
    const [i] = e;
    if (!i) return;
    const [o] = i.steps;
    if (i.getMeta("hardbreak")) {
      if (!(o instanceof we)) return;
      const { from: a } = o;
      return r.tr.setNodeMarkup(
        a,
        ir.type(n),
        void 0,
        []
      );
    }
    if (o instanceof Zt) {
      let a = r.tr;
      const { from: c, to: u } = o;
      return r.doc.nodesBetween(c, u, (d, h) => {
        d.type === ir.type(n) && (a = a.setNodeMarkup(
          h,
          ir.type(n),
          void 0,
          []
        ));
      }), a;
    }
  }
}));
E(gy, {
  displayName: "Prose<hardbreakClearMarkPlugin>",
  group: "Prose"
});
const Xu = ln(
  ["table", "code_block"],
  "hardbreakFilterNodes"
);
E(Xu, {
  displayName: "Ctx<hardbreakFilterNodes>",
  group: "Prose"
});
const yy = ot((n) => {
  const e = n.get(Xu.key);
  return new xe({
    key: new ge("MILKDOWN_HARDBREAK_FILTER"),
    filterTransaction: (t, r) => {
      const i = t.getMeta("hardbreak"), [o] = t.steps;
      if (i && o) {
        const { from: s } = o, l = r.doc.resolve(s);
        let a = l.depth, c = !0;
        for (; a > 0; )
          e.includes(l.node(a).type.name) && (c = !1), a--;
        return c;
      }
      return !0;
    }
  });
});
E(yy, {
  displayName: "Prose<hardbreakFilterPlugin>",
  group: "Prose"
});
const by = ot((n) => {
  const e = new ge("MILKDOWN_HEADING_ID"), t = (r) => {
    if (r.composing) return;
    const i = n.get(Cl.key), o = r.state.tr.setMeta("addToHistory", !1);
    let s = !1;
    const l = {};
    r.state.doc.descendants((a, c) => {
      if (a.type === pr.type(n)) {
        if (a.textContent.trim().length === 0) return;
        const u = a.attrs;
        let d = i(a);
        l[d] ? (l[d] += 1, d += `-#${l[d]}`) : l[d] = 1, u.id !== d && (s = !0, o.setMeta(e, !0).setNodeMarkup(c, void 0, {
          ...u,
          id: d
        }));
      }
    }), s && r.dispatch(o);
  };
  return new xe({
    key: e,
    view: (r) => (t(r), {
      update: (i, o) => {
        i.state.doc.eq(o.doc) || t(i);
      }
    })
  });
});
E(by, {
  displayName: "Prose<syncHeadingIdPlugin>",
  group: "Prose"
});
const ky = ot((n) => {
  const e = (t, r, i) => {
    if (!i.selection || t.some(
      (d) => d.getMeta("addToHistory") === !1 || !d.isGeneric
    ))
      return null;
    const o = fi.type(n), s = hi.type(n), l = cn.type(n), a = (d, h) => {
      let f = !1;
      const p = `${h + 1}.`;
      return d.label !== p && (d.label = p, f = !0), f;
    };
    let c = i.tr, u = !1;
    return i.doc.descendants(
      (d, h, f, p) => {
        if (d.type === s) {
          const m = d.maybeChild(0);
          m?.type === l && m.attrs.listType === "ordered" && (u = !0, c.setNodeMarkup(h, o, { spread: "true" }), d.descendants(
            (y, g, C, x) => {
              if (y.type === l) {
                const L = { ...y.attrs };
                a(L, x) && (c = c.setNodeMarkup(g, void 0, L));
              }
              return !1;
            }
          ));
        } else if (d.type === l && f?.type === o) {
          const m = { ...d.attrs };
          let y = !1;
          m.listType !== "ordered" && (m.listType = "ordered", y = !0), f?.maybeChild(0) && (y = a(m, p)), y && (c = c.setNodeMarkup(h, void 0, m), u = !0);
        }
      }
    ), u ? c.setMeta("addToHistory", !1) : null;
  };
  return new xe({
    key: new ge("MILKDOWN_KEEP_LIST_ORDER"),
    appendTransaction: e
  });
});
E(ky, {
  displayName: "Prose<syncListOrderPlugin>",
  group: "Prose"
});
const $N = [
  gy,
  Xu,
  yy,
  my,
  Wu,
  Ju,
  Ku,
  Gu,
  Yu,
  wl,
  by,
  ky
].flat(), zN = [
  CN,
  SN,
  xN,
  ON,
  RN,
  $N
].flat();
var Sc, xc;
if (typeof WeakMap < "u") {
  let n = /* @__PURE__ */ new WeakMap();
  Sc = (e) => n.get(e), xc = (e, t) => (n.set(e, t), t);
} else {
  const n = [];
  let t = 0;
  Sc = (r) => {
    for (let i = 0; i < n.length; i += 2)
      if (n[i] == r) return n[i + 1];
  }, xc = (r, i) => (t == 10 && (t = 0), n[t++] = r, n[t++] = i);
}
var re = class {
  constructor(n, e, t, r) {
    this.width = n, this.height = e, this.map = t, this.problems = r;
  }
  // Find the dimensions of the cell at the given position.
  findCell(n) {
    for (let e = 0; e < this.map.length; e++) {
      const t = this.map[e];
      if (t != n) continue;
      const r = e % this.width, i = e / this.width | 0;
      let o = r + 1, s = i + 1;
      for (let l = 1; o < this.width && this.map[e + l] == t; l++)
        o++;
      for (let l = 1; s < this.height && this.map[e + this.width * l] == t; l++)
        s++;
      return { left: r, top: i, right: o, bottom: s };
    }
    throw new RangeError(`No cell with offset ${n} found`);
  }
  // Find the left side of the cell at the given position.
  colCount(n) {
    for (let e = 0; e < this.map.length; e++)
      if (this.map[e] == n)
        return e % this.width;
    throw new RangeError(`No cell with offset ${n} found`);
  }
  // Find the next cell in the given direction, starting from the cell
  // at `pos`, if any.
  nextCell(n, e, t) {
    const { left: r, right: i, top: o, bottom: s } = this.findCell(n);
    return e == "horiz" ? (t < 0 ? r == 0 : i == this.width) ? null : this.map[o * this.width + (t < 0 ? r - 1 : i)] : (t < 0 ? o == 0 : s == this.height) ? null : this.map[r + this.width * (t < 0 ? o - 1 : s)];
  }
  // Get the rectangle spanning the two given cells.
  rectBetween(n, e) {
    const {
      left: t,
      right: r,
      top: i,
      bottom: o
    } = this.findCell(n), {
      left: s,
      right: l,
      top: a,
      bottom: c
    } = this.findCell(e);
    return {
      left: Math.min(t, s),
      top: Math.min(i, a),
      right: Math.max(r, l),
      bottom: Math.max(o, c)
    };
  }
  // Return the position of all cells that have the top left corner in
  // the given rectangle.
  cellsInRect(n) {
    const e = [], t = {};
    for (let r = n.top; r < n.bottom; r++)
      for (let i = n.left; i < n.right; i++) {
        const o = r * this.width + i, s = this.map[o];
        t[s] || (t[s] = !0, !(i == n.left && i && this.map[o - 1] == s || r == n.top && r && this.map[o - this.width] == s) && e.push(s));
      }
    return e;
  }
  // Return the position at which the cell at the given row and column
  // starts, or would start, if a cell started there.
  positionAt(n, e, t) {
    for (let r = 0, i = 0; ; r++) {
      const o = i + t.child(r).nodeSize;
      if (r == n) {
        let s = e + n * this.width;
        const l = (n + 1) * this.width;
        for (; s < l && this.map[s] < i; ) s++;
        return s == l ? o - 1 : this.map[s];
      }
      i = o;
    }
  }
  // Find the table map for the given table node.
  static get(n) {
    return Sc(n) || xc(n, FN(n));
  }
};
function FN(n) {
  if (n.type.spec.tableRole != "table")
    throw new RangeError("Not a table node: " + n.type.name);
  const e = _N(n), t = n.childCount, r = [];
  let i = 0, o = null;
  const s = [];
  for (let c = 0, u = e * t; c < u; c++) r[c] = 0;
  for (let c = 0, u = 0; c < t; c++) {
    const d = n.child(c);
    u++;
    for (let p = 0; ; p++) {
      for (; i < r.length && r[i] != 0; ) i++;
      if (p == d.childCount) break;
      const m = d.child(p), { colspan: y, rowspan: g, colwidth: C } = m.attrs;
      for (let x = 0; x < g; x++) {
        if (x + c >= t) {
          (o || (o = [])).push({
            type: "overlong_rowspan",
            pos: u,
            n: g - x
          });
          break;
        }
        const L = i + x * e;
        for (let D = 0; D < y; D++) {
          r[L + D] == 0 ? r[L + D] = u : (o || (o = [])).push({
            type: "collision",
            row: c,
            pos: u,
            n: y - D
          });
          const w = C && C[D];
          if (w) {
            const A = (L + D) % e * 2, B = s[A];
            B == null || B != w && s[A + 1] == 1 ? (s[A] = w, s[A + 1] = 1) : B == w && s[A + 1]++;
          }
        }
      }
      i += y, u += m.nodeSize;
    }
    const h = (c + 1) * e;
    let f = 0;
    for (; i < h; ) r[i++] == 0 && f++;
    f && (o || (o = [])).push({ type: "missing", row: c, n: f }), u++;
  }
  (e === 0 || t === 0) && (o || (o = [])).push({ type: "zero_sized" });
  const l = new re(e, t, r, o);
  let a = !1;
  for (let c = 0; !a && c < s.length; c += 2)
    s[c] != null && s[c + 1] < t && (a = !0);
  return a && HN(l, s, n), l;
}
function _N(n) {
  let e = -1, t = !1;
  for (let r = 0; r < n.childCount; r++) {
    const i = n.child(r);
    let o = 0;
    if (t)
      for (let s = 0; s < r; s++) {
        const l = n.child(s);
        for (let a = 0; a < l.childCount; a++) {
          const c = l.child(a);
          s + c.attrs.rowspan > r && (o += c.attrs.colspan);
        }
      }
    for (let s = 0; s < i.childCount; s++) {
      const l = i.child(s);
      o += l.attrs.colspan, l.attrs.rowspan > 1 && (t = !0);
    }
    e == -1 ? e = o : e != o && (e = Math.max(e, o));
  }
  return e;
}
function HN(n, e, t) {
  n.problems || (n.problems = []);
  const r = {};
  for (let i = 0; i < n.map.length; i++) {
    const o = n.map[i];
    if (r[o]) continue;
    r[o] = !0;
    const s = t.nodeAt(o);
    if (!s)
      throw new RangeError(`No cell with offset ${o} found`);
    let l = null;
    const a = s.attrs;
    for (let c = 0; c < a.colspan; c++) {
      const u = (i + c) % n.width, d = e[u * 2];
      d != null && (!a.colwidth || a.colwidth[c] != d) && ((l || (l = qN(a)))[c] = d);
    }
    l && n.problems.unshift({
      type: "colwidth mismatch",
      pos: o,
      colwidth: l
    });
  }
}
function qN(n) {
  if (n.colwidth) return n.colwidth.slice();
  const e = [];
  for (let t = 0; t < n.colspan; t++) e.push(0);
  return e;
}
function xf(n, e) {
  if (typeof n == "string")
    return {};
  const t = n.getAttribute("data-colwidth"), r = t && /^\d+(,\d+)*$/.test(t) ? t.split(",").map((s) => Number(s)) : null, i = Number(n.getAttribute("colspan") || 1), o = {
    colspan: i,
    rowspan: Number(n.getAttribute("rowspan") || 1),
    colwidth: r && r.length == i ? r : null
  };
  for (const s in e) {
    const l = e[s].getFromDOM, a = l && l(n);
    a != null && (o[s] = a);
  }
  return o;
}
function vf(n, e) {
  const t = {};
  n.attrs.colspan != 1 && (t.colspan = n.attrs.colspan), n.attrs.rowspan != 1 && (t.rowspan = n.attrs.rowspan), n.attrs.colwidth && (t["data-colwidth"] = n.attrs.colwidth.join(","));
  for (const r in e) {
    const i = e[r].setDOMAttr;
    i && i(n.attrs[r], t);
  }
  return t;
}
function jN(n) {
  if (n !== null) {
    if (!Array.isArray(n))
      throw new TypeError("colwidth must be null or an array");
    for (const e of n)
      if (typeof e != "number")
        throw new TypeError("colwidth must be null or an array of numbers");
  }
}
function VN(n) {
  const e = n.cellAttributes || {}, t = {
    colspan: { default: 1, validate: "number" },
    rowspan: { default: 1, validate: "number" },
    colwidth: { default: null, validate: jN }
  };
  for (const r in e)
    t[r] = {
      default: e[r].default,
      validate: e[r].validate
    };
  return {
    table: {
      content: "table_row+",
      tableRole: "table",
      isolating: !0,
      group: n.tableGroup,
      parseDOM: [{ tag: "table" }],
      toDOM() {
        return ["table", ["tbody", 0]];
      }
    },
    table_row: {
      content: "(table_cell | table_header)*",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM() {
        return ["tr", 0];
      }
    },
    table_cell: {
      content: n.cellContent,
      attrs: t,
      tableRole: "cell",
      isolating: !0,
      parseDOM: [
        { tag: "td", getAttrs: (r) => xf(r, e) }
      ],
      toDOM(r) {
        return ["td", vf(r, e), 0];
      }
    },
    table_header: {
      content: n.cellContent,
      attrs: t,
      tableRole: "header_cell",
      isolating: !0,
      parseDOM: [
        { tag: "th", getAttrs: (r) => xf(r, e) }
      ],
      toDOM(r) {
        return ["th", vf(r, e), 0];
      }
    }
  };
}
function mt(n) {
  let e = n.cached.tableNodeTypes;
  if (!e) {
    e = n.cached.tableNodeTypes = {};
    for (const t in n.nodes) {
      const r = n.nodes[t], i = r.spec.tableRole;
      i && (e[i] = r);
    }
  }
  return e;
}
var gn = new ge("selectingCells");
function Lo(n) {
  for (let e = n.depth - 1; e > 0; e--)
    if (n.node(e).type.spec.tableRole == "row")
      return n.node(0).resolve(n.before(e + 1));
  return null;
}
function yt(n) {
  const e = n.selection.$head;
  for (let t = e.depth; t > 0; t--)
    if (e.node(t).type.spec.tableRole == "row") return !0;
  return !1;
}
function Ml(n) {
  const e = n.selection;
  if ("$anchorCell" in e && e.$anchorCell)
    return e.$anchorCell.pos > e.$headCell.pos ? e.$anchorCell : e.$headCell;
  if ("node" in e && e.node && e.node.type.spec.tableRole == "cell")
    return e.$anchor;
  const t = Lo(e.$head) || UN(e.$head);
  if (t)
    return t;
  throw new RangeError(`No cell found around position ${e.head}`);
}
function UN(n) {
  for (let e = n.nodeAfter, t = n.pos; e; e = e.firstChild, t++) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell") return n.doc.resolve(t);
  }
  for (let e = n.nodeBefore, t = n.pos; e; e = e.lastChild, t--) {
    const r = e.type.spec.tableRole;
    if (r == "cell" || r == "header_cell")
      return n.doc.resolve(t - e.nodeSize);
  }
}
function vc(n) {
  return n.parent.type.spec.tableRole == "row" && !!n.nodeAfter;
}
function WN(n) {
  return n.node(0).resolve(n.pos + n.nodeAfter.nodeSize);
}
function Qu(n, e) {
  return n.depth == e.depth && n.pos >= e.start(-1) && n.pos <= e.end(-1);
}
function wy(n, e, t) {
  const r = n.node(-1), i = re.get(r), o = n.start(-1), s = i.nextCell(n.pos - o, e, t);
  return s == null ? null : n.node(0).resolve(o + s);
}
function dr(n, e, t = 1) {
  const r = { ...n, colspan: n.colspan - t };
  return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(e, t), r.colwidth.some((i) => i > 0) || (r.colwidth = null)), r;
}
function KN(n, e, t = 1) {
  const r = { ...n, colspan: n.colspan + t };
  if (r.colwidth) {
    r.colwidth = r.colwidth.slice();
    for (let i = 0; i < t; i++) r.colwidth.splice(e, 0, 0);
  }
  return r;
}
function JN(n, e, t) {
  const r = mt(e.type.schema).header_cell;
  for (let i = 0; i < n.height; i++)
    if (e.nodeAt(n.map[t + i * n.width]).type != r)
      return !1;
  return !0;
}
var ue = class jt extends U {
  // A table selection is identified by its anchor and head cells. The
  // positions given to this constructor should point _before_ two
  // cells in the same table. They may be the same, to select a single
  // cell.
  constructor(e, t = e) {
    const r = e.node(-1), i = re.get(r), o = e.start(-1), s = i.rectBetween(
      e.pos - o,
      t.pos - o
    ), l = e.node(0), a = i.cellsInRect(s).filter((u) => u != t.pos - o);
    a.unshift(t.pos - o);
    const c = a.map((u) => {
      const d = r.nodeAt(u);
      if (!d)
        throw RangeError(`No cell with offset ${u} found`);
      const h = o + u + 1;
      return new Vm(
        l.resolve(h),
        l.resolve(h + d.content.size)
      );
    });
    super(c[0].$from, c[0].$to, c), this.$anchorCell = e, this.$headCell = t;
  }
  map(e, t) {
    const r = e.resolve(t.map(this.$anchorCell.pos)), i = e.resolve(t.map(this.$headCell.pos));
    if (vc(r) && vc(i) && Qu(r, i)) {
      const o = this.$anchorCell.node(-1) != r.node(-1);
      return o && this.isRowSelection() ? jt.rowSelection(r, i) : o && this.isColSelection() ? jt.colSelection(r, i) : new jt(r, i);
    }
    return J.between(r, i);
  }
  // Returns a rectangular slice of table rows containing the selected
  // cells.
  content() {
    const e = this.$anchorCell.node(-1), t = re.get(e), r = this.$anchorCell.start(-1), i = t.rectBetween(
      this.$anchorCell.pos - r,
      this.$headCell.pos - r
    ), o = {}, s = [];
    for (let a = i.top; a < i.bottom; a++) {
      const c = [];
      for (let u = a * t.width + i.left, d = i.left; d < i.right; d++, u++) {
        const h = t.map[u];
        if (o[h]) continue;
        o[h] = !0;
        const f = t.findCell(h);
        let p = e.nodeAt(h);
        if (!p)
          throw RangeError(`No cell with offset ${h} found`);
        const m = i.left - f.left, y = f.right - i.right;
        if (m > 0 || y > 0) {
          let g = p.attrs;
          if (m > 0 && (g = dr(g, 0, m)), y > 0 && (g = dr(
            g,
            g.colspan - y,
            y
          )), f.left < i.left) {
            if (p = p.type.createAndFill(g), !p)
              throw RangeError(
                `Could not create cell with attrs ${JSON.stringify(g)}`
              );
          } else
            p = p.type.create(g, p.content);
        }
        if (f.top < i.top || f.bottom > i.bottom) {
          const g = {
            ...p.attrs,
            rowspan: Math.min(f.bottom, i.bottom) - Math.max(f.top, i.top)
          };
          f.top < i.top ? p = p.type.createAndFill(g) : p = p.type.create(g, p.content);
        }
        c.push(p);
      }
      s.push(e.child(a).copy(N.from(c)));
    }
    const l = this.isColSelection() && this.isRowSelection() ? e : s;
    return new R(N.from(l), 1, 1);
  }
  replace(e, t = R.empty) {
    const r = e.steps.length, i = this.ranges;
    for (let s = 0; s < i.length; s++) {
      const { $from: l, $to: a } = i[s], c = e.mapping.slice(r);
      e.replace(
        c.map(l.pos),
        c.map(a.pos),
        s ? R.empty : t
      );
    }
    const o = U.findFrom(
      e.doc.resolve(e.mapping.slice(r).map(this.to)),
      -1
    );
    o && e.setSelection(o);
  }
  replaceWith(e, t) {
    this.replace(e, new R(N.from(t), 0, 0));
  }
  forEachCell(e) {
    const t = this.$anchorCell.node(-1), r = re.get(t), i = this.$anchorCell.start(-1), o = r.cellsInRect(
      r.rectBetween(
        this.$anchorCell.pos - i,
        this.$headCell.pos - i
      )
    );
    for (let s = 0; s < o.length; s++)
      e(t.nodeAt(o[s]), i + o[s]);
  }
  // True if this selection goes all the way from the top to the
  // bottom of the table.
  isColSelection() {
    const e = this.$anchorCell.index(-1), t = this.$headCell.index(-1);
    if (Math.min(e, t) > 0) return !1;
    const r = e + this.$anchorCell.nodeAfter.attrs.rowspan, i = t + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(r, i) == this.$headCell.node(-1).childCount;
  }
  // Returns the smallest column selection that covers the given anchor
  // and head cell.
  static colSelection(e, t = e) {
    const r = e.node(-1), i = re.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(t.pos - o), a = e.node(0);
    return s.top <= l.top ? (s.top > 0 && (e = a.resolve(o + i.map[s.left])), l.bottom < i.height && (t = a.resolve(
      o + i.map[i.width * (i.height - 1) + l.right - 1]
    ))) : (l.top > 0 && (t = a.resolve(o + i.map[l.left])), s.bottom < i.height && (e = a.resolve(
      o + i.map[i.width * (i.height - 1) + s.right - 1]
    ))), new jt(e, t);
  }
  // True if this selection goes all the way from the left to the
  // right of the table.
  isRowSelection() {
    const e = this.$anchorCell.node(-1), t = re.get(e), r = this.$anchorCell.start(-1), i = t.colCount(this.$anchorCell.pos - r), o = t.colCount(this.$headCell.pos - r);
    if (Math.min(i, o) > 0) return !1;
    const s = i + this.$anchorCell.nodeAfter.attrs.colspan, l = o + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(s, l) == t.width;
  }
  eq(e) {
    return e instanceof jt && e.$anchorCell.pos == this.$anchorCell.pos && e.$headCell.pos == this.$headCell.pos;
  }
  // Returns the smallest row selection that covers the given anchor
  // and head cell.
  static rowSelection(e, t = e) {
    const r = e.node(-1), i = re.get(r), o = e.start(-1), s = i.findCell(e.pos - o), l = i.findCell(t.pos - o), a = e.node(0);
    return s.left <= l.left ? (s.left > 0 && (e = a.resolve(
      o + i.map[s.top * i.width]
    )), l.right < i.width && (t = a.resolve(
      o + i.map[i.width * (l.top + 1) - 1]
    ))) : (l.left > 0 && (t = a.resolve(o + i.map[l.top * i.width])), s.right < i.width && (e = a.resolve(
      o + i.map[i.width * (s.top + 1) - 1]
    ))), new jt(e, t);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(e, t) {
    return new jt(e.resolve(t.anchor), e.resolve(t.head));
  }
  static create(e, t, r = t) {
    return new jt(e.resolve(t), e.resolve(r));
  }
  getBookmark() {
    return new GN(this.$anchorCell.pos, this.$headCell.pos);
  }
};
ue.prototype.visible = !1;
U.jsonID("cell", ue);
var GN = class Cy {
  constructor(e, t) {
    this.anchor = e, this.head = t;
  }
  map(e) {
    return new Cy(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    const t = e.resolve(this.anchor), r = e.resolve(this.head);
    return t.parent.type.spec.tableRole == "row" && r.parent.type.spec.tableRole == "row" && t.index() < t.parent.childCount && r.index() < r.parent.childCount && Qu(t, r) ? new ue(t, r) : U.near(r, 1);
  }
};
function YN(n) {
  if (!(n.selection instanceof ue)) return null;
  const e = [];
  return n.selection.forEachCell((t, r) => {
    e.push(
      Ce.node(r, r + t.nodeSize, { class: "selectedCell" })
    );
  }), se.create(n.doc, e);
}
function XN({ $from: n, $to: e }) {
  if (n.pos == e.pos || n.pos < e.pos - 6) return !1;
  let t = n.pos, r = e.pos, i = n.depth;
  for (; i >= 0 && !(n.after(i + 1) < n.end(i)); i--, t++)
    ;
  for (let o = e.depth; o >= 0 && !(e.before(o + 1) > e.start(o)); o--, r--)
    ;
  return t == r && /row|table/.test(n.node(i).type.spec.tableRole);
}
function QN({ $from: n, $to: e }) {
  let t, r;
  for (let i = n.depth; i > 0; i--) {
    const o = n.node(i);
    if (o.type.spec.tableRole === "cell" || o.type.spec.tableRole === "header_cell") {
      t = o;
      break;
    }
  }
  for (let i = e.depth; i > 0; i--) {
    const o = e.node(i);
    if (o.type.spec.tableRole === "cell" || o.type.spec.tableRole === "header_cell") {
      r = o;
      break;
    }
  }
  return t !== r && e.parentOffset === 0;
}
function ZN(n, e, t) {
  const r = (e || n).selection, i = (e || n).doc;
  let o, s;
  if (r instanceof q && (s = r.node.type.spec.tableRole)) {
    if (s == "cell" || s == "header_cell")
      o = ue.create(i, r.from);
    else if (s == "row") {
      const l = i.resolve(r.from + 1);
      o = ue.rowSelection(l, l);
    } else if (!t) {
      const l = re.get(r.node), a = r.from + 1, c = a + l.map[l.width * l.height - 1];
      o = ue.create(i, a + 1, c);
    }
  } else r instanceof J && XN(r) ? o = J.create(i, r.from) : r instanceof J && QN(r) && (o = J.create(i, r.$from.start(), r.$from.end()));
  return o && (e || (e = n.tr)).setSelection(o), e;
}
var eI = new ge("fix-tables");
function Sy(n, e, t, r) {
  const i = n.childCount, o = e.childCount;
  e: for (let s = 0, l = 0; s < o; s++) {
    const a = e.child(s);
    for (let c = l, u = Math.min(i, s + 3); c < u; c++)
      if (n.child(c) == a) {
        l = c + 1, t += a.nodeSize;
        continue e;
      }
    r(a, t), l < i && n.child(l).sameMarkup(a) ? Sy(n.child(l), a, t + 1, r) : a.nodesBetween(0, a.content.size, r, t + 1), t += a.nodeSize;
  }
}
function tI(n, e) {
  let t;
  const r = (i, o) => {
    i.type.spec.tableRole == "table" && (t = nI(n, i, o, t));
  };
  return e ? e.doc != n.doc && Sy(e.doc, n.doc, 0, r) : n.doc.descendants(r), t;
}
function nI(n, e, t, r) {
  const i = re.get(e);
  if (!i.problems) return r;
  r || (r = n.tr);
  const o = [];
  for (let a = 0; a < i.height; a++) o.push(0);
  for (let a = 0; a < i.problems.length; a++) {
    const c = i.problems[a];
    if (c.type == "collision") {
      const u = e.nodeAt(c.pos);
      if (!u) continue;
      const d = u.attrs;
      for (let h = 0; h < d.rowspan; h++) o[c.row + h] += c.n;
      r.setNodeMarkup(
        r.mapping.map(t + 1 + c.pos),
        null,
        dr(d, d.colspan - c.n, c.n)
      );
    } else if (c.type == "missing")
      o[c.row] += c.n;
    else if (c.type == "overlong_rowspan") {
      const u = e.nodeAt(c.pos);
      if (!u) continue;
      r.setNodeMarkup(r.mapping.map(t + 1 + c.pos), null, {
        ...u.attrs,
        rowspan: u.attrs.rowspan - c.n
      });
    } else if (c.type == "colwidth mismatch") {
      const u = e.nodeAt(c.pos);
      if (!u) continue;
      r.setNodeMarkup(r.mapping.map(t + 1 + c.pos), null, {
        ...u.attrs,
        colwidth: c.colwidth
      });
    } else if (c.type == "zero_sized") {
      const u = r.mapping.map(t);
      r.delete(u, u + e.nodeSize);
    }
  }
  let s, l;
  for (let a = 0; a < o.length; a++)
    o[a] && (s == null && (s = a), l = a);
  for (let a = 0, c = t + 1; a < i.height; a++) {
    const u = e.child(a), d = c + u.nodeSize, h = o[a];
    if (h > 0) {
      let f = "cell";
      u.firstChild && (f = u.firstChild.type.spec.tableRole);
      const p = [];
      for (let y = 0; y < h; y++) {
        const g = mt(n.schema)[f].createAndFill();
        g && p.push(g);
      }
      const m = (a == 0 || s == a - 1) && l == a ? c + 1 : d - 1;
      r.insert(r.mapping.map(m), p);
    }
    c = d;
  }
  return r.setMeta(eI, { fixTables: !0 });
}
function xy(n) {
  const e = re.get(n), t = [], r = e.height, i = e.width;
  for (let o = 0; o < r; o++) {
    const s = [];
    for (let l = 0; l < i; l++) {
      const a = o * i + l, c = e.map[a];
      if (o > 0) {
        const u = a - i, d = e.map[u];
        if (c === d) {
          s.push(null);
          continue;
        }
      }
      if (l > 0) {
        const u = a - 1, d = e.map[u];
        if (c === d) {
          s.push(null);
          continue;
        }
      }
      s.push(n.nodeAt(c));
    }
    t.push(s);
  }
  return t;
}
function vy(n, e) {
  const t = [], r = re.get(n), i = r.height, o = r.width;
  for (let l = 0; l < i; l++) {
    const a = n.child(l), c = [];
    for (let d = 0; d < o; d++) {
      const h = e[l][d];
      if (!h)
        continue;
      const f = r.map[l * r.width + d], p = n.nodeAt(f);
      if (!p)
        continue;
      const m = p.type.createChecked(
        h.attrs,
        h.content,
        h.marks
      );
      c.push(m);
    }
    const u = a.type.createChecked(
      a.attrs,
      c,
      a.marks
    );
    t.push(u);
  }
  return n.type.createChecked(
    n.attrs,
    t,
    n.marks
  );
}
function Po(n) {
  return rI((e) => e.type.spec.tableRole === "table", n);
}
function rI(n, e) {
  for (let t = e.depth; t >= 0; t -= 1) {
    const r = e.node(t);
    if (n(r)) {
      const i = t === 0 ? 0 : e.before(t), o = e.start(t);
      return { node: r, pos: i, start: o, depth: t };
    }
  }
  return null;
}
function Tr(n, e) {
  const t = Po(e.$from);
  if (!t)
    return;
  const r = re.get(t.node);
  return n < 0 || n > r.width - 1 ? void 0 : r.cellsInRect({
    left: n,
    right: n + 1,
    top: 0,
    bottom: r.height
  }).map((o) => {
    const s = t.node.nodeAt(o), l = o + t.start;
    return { pos: l, start: l + 1, node: s, depth: t.depth + 2 };
  });
}
function Nr(n, e) {
  const t = Po(e.$from);
  if (!t)
    return;
  const r = re.get(t.node);
  return n < 0 || n > r.height - 1 ? void 0 : r.cellsInRect({
    left: 0,
    right: r.width,
    top: n,
    bottom: n + 1
  }).map((o) => {
    const s = t.node.nodeAt(o), l = o + t.start;
    return { pos: l, start: l + 1, node: s, depth: t.depth + 2 };
  });
}
function Ef(n, e, t = e) {
  let r = e, i = t;
  for (let d = e; d >= 0; d--) {
    const h = Tr(d, n.selection);
    h && h.forEach((f) => {
      const p = f.node.attrs.colspan + d - 1;
      p >= r && (r = d), p > i && (i = p);
    });
  }
  for (let d = e; d <= i; d++) {
    const h = Tr(d, n.selection);
    h && h.forEach((f) => {
      const p = f.node.attrs.colspan + d - 1;
      f.node.attrs.colspan > 1 && p > i && (i = p);
    });
  }
  const o = [];
  for (let d = r; d <= i; d++) {
    const h = Tr(d, n.selection);
    h && h.length > 0 && o.push(d);
  }
  r = o[0], i = o[o.length - 1];
  const s = Tr(r, n.selection), l = Nr(0, n.selection);
  if (!s || !l)
    return;
  const a = n.doc.resolve(
    s[s.length - 1].pos
  );
  let c;
  for (let d = i; d >= r; d--) {
    const h = Tr(d, n.selection);
    if (h && h.length > 0) {
      for (let f = l.length - 1; f >= 0; f--)
        if (l[f].pos === h[0].pos) {
          c = h[0];
          break;
        }
      if (c)
        break;
    }
  }
  if (!c)
    return;
  const u = n.doc.resolve(c.pos);
  return { $anchor: a, $head: u, indexes: o };
}
function Mf(n, e, t = e) {
  let r = e, i = t;
  for (let d = e; d >= 0; d--) {
    const h = Nr(d, n.selection);
    h && h.forEach((f) => {
      const p = f.node.attrs.rowspan + d - 1;
      p >= r && (r = d), p > i && (i = p);
    });
  }
  for (let d = e; d <= i; d++) {
    const h = Nr(d, n.selection);
    h && h.forEach((f) => {
      const p = f.node.attrs.rowspan + d - 1;
      f.node.attrs.rowspan > 1 && p > i && (i = p);
    });
  }
  const o = [];
  for (let d = r; d <= i; d++) {
    const h = Nr(d, n.selection);
    h && h.length > 0 && o.push(d);
  }
  r = o[0], i = o[o.length - 1];
  const s = Nr(r, n.selection), l = Tr(0, n.selection);
  if (!s || !l)
    return;
  const a = n.doc.resolve(
    s[s.length - 1].pos
  );
  let c;
  for (let d = i; d >= r; d--) {
    const h = Nr(d, n.selection);
    if (h && h.length > 0) {
      for (let f = l.length - 1; f >= 0; f--)
        if (l[f].pos === h[0].pos) {
          c = h[0];
          break;
        }
      if (c)
        break;
    }
  }
  if (!c)
    return;
  const u = n.doc.resolve(c.pos);
  return { $anchor: a, $head: u, indexes: o };
}
function Ey(n, e, t, r) {
  const i = e[0] > t[0] ? -1 : 1, o = n.splice(e[0], e.length), s = o.length % 2 === 0 ? 1 : 0;
  let l;
  return l = i === -1 ? t[0] : t[t.length - 1] - s, n.splice(l, 0, ...o), n;
}
function Tf(n) {
  return n[0].map((e, t) => n.map((r) => r[t]));
}
function iI(n) {
  var e, t;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = n, a = r.doc.resolve(l), c = Po(a);
  if (!c) return !1;
  const u = (e = Ef(
    r,
    i
  )) == null ? void 0 : e.indexes, d = (t = Ef(
    r,
    o
  )) == null ? void 0 : t.indexes;
  if (!u || !d || u.includes(o)) return !1;
  const h = oI(
    c.node,
    u,
    d
  );
  if (r.replaceWith(c.pos, c.pos + c.node.nodeSize, h), !s) return !0;
  const f = re.get(h), p = c.start, m = o, y = f.positionAt(f.height - 1, m, h), g = r.doc.resolve(p + y), C = f.positionAt(0, m, h), x = r.doc.resolve(p + C);
  return r.setSelection(ue.colSelection(g, x)), !0;
}
function oI(n, e, t, r) {
  let i = Tf(xy(n));
  return i = Ey(i, e, t), i = Tf(i), vy(n, i);
}
function sI(n) {
  var e, t;
  const { tr: r, originIndex: i, targetIndex: o, select: s, pos: l } = n, a = r.doc.resolve(l), c = Po(a);
  if (!c) return !1;
  const u = (e = Mf(r, i)) == null ? void 0 : e.indexes, d = (t = Mf(r, o)) == null ? void 0 : t.indexes;
  if (!u || !d || u.includes(o)) return !1;
  const h = lI(
    c.node,
    u,
    d
  );
  if (r.replaceWith(c.pos, c.pos + c.node.nodeSize, h), !s) return !0;
  const f = re.get(h), p = c.start, m = o, y = f.positionAt(m, f.width - 1, h), g = r.doc.resolve(p + y), C = f.positionAt(m, 0, h), x = r.doc.resolve(p + C);
  return r.setSelection(ue.rowSelection(g, x)), !0;
}
function lI(n, e, t, r) {
  let i = xy(n);
  return i = Ey(i, e, t), vy(n, i);
}
function Pn(n) {
  const e = n.selection, t = Ml(n), r = t.node(-1), i = t.start(-1), o = re.get(r);
  return { ...e instanceof ue ? o.rectBetween(
    e.$anchorCell.pos - i,
    e.$headCell.pos - i
  ) : o.findCell(t.pos - i), tableStart: i, map: o, table: r };
}
function My(n, { map: e, tableStart: t, table: r }, i) {
  let o = i > 0 ? -1 : 0;
  JN(e, r, i + o) && (o = i == 0 || i == e.width ? null : 0);
  for (let s = 0; s < e.height; s++) {
    const l = s * e.width + i;
    if (i > 0 && i < e.width && e.map[l - 1] == e.map[l]) {
      const a = e.map[l], c = r.nodeAt(a);
      n.setNodeMarkup(
        n.mapping.map(t + a),
        null,
        KN(c.attrs, i - e.colCount(a))
      ), s += c.attrs.rowspan - 1;
    } else {
      const a = o == null ? mt(r.type.schema).cell : r.nodeAt(e.map[l + o]).type, c = e.positionAt(s, i, r);
      n.insert(n.mapping.map(t + c), a.createAndFill());
    }
  }
  return n;
}
function aI(n, e) {
  if (!yt(n)) return !1;
  if (e) {
    const t = Pn(n);
    e(My(n.tr, t, t.left));
  }
  return !0;
}
function cI(n, e) {
  if (!yt(n)) return !1;
  if (e) {
    const t = Pn(n);
    e(My(n.tr, t, t.right));
  }
  return !0;
}
function uI(n, { map: e, table: t, tableStart: r }, i) {
  const o = n.mapping.maps.length;
  for (let s = 0; s < e.height; ) {
    const l = s * e.width + i, a = e.map[l], c = t.nodeAt(a), u = c.attrs;
    if (i > 0 && e.map[l - 1] == a || i < e.width - 1 && e.map[l + 1] == a)
      n.setNodeMarkup(
        n.mapping.slice(o).map(r + a),
        null,
        dr(u, i - e.colCount(a))
      );
    else {
      const d = n.mapping.slice(o).map(r + a);
      n.delete(d, d + c.nodeSize);
    }
    s += u.rowspan;
  }
}
function dI(n, e) {
  if (!yt(n)) return !1;
  if (e) {
    const t = Pn(n), r = n.tr;
    if (t.left == 0 && t.right == t.map.width) return !1;
    for (let i = t.right - 1; uI(r, t, i), i != t.left; i--) {
      const o = t.tableStart ? r.doc.nodeAt(t.tableStart - 1) : r.doc;
      if (!o)
        throw RangeError("No table found");
      t.table = o, t.map = re.get(o);
    }
    e(r);
  }
  return !0;
}
function hI(n, { map: e, table: t, tableStart: r }, i) {
  let o = 0;
  for (let c = 0; c < i; c++) o += t.child(c).nodeSize;
  const s = o + t.child(i).nodeSize, l = n.mapping.maps.length;
  n.delete(o + r, s + r);
  const a = /* @__PURE__ */ new Set();
  for (let c = 0, u = i * e.width; c < e.width; c++, u++) {
    const d = e.map[u];
    if (!a.has(d)) {
      if (a.add(d), i > 0 && d == e.map[u - e.width]) {
        const h = t.nodeAt(d).attrs;
        n.setNodeMarkup(n.mapping.slice(l).map(d + r), null, {
          ...h,
          rowspan: h.rowspan - 1
        }), c += h.colspan - 1;
      } else if (i < e.height && d == e.map[u + e.width]) {
        const h = t.nodeAt(d), f = h.attrs, p = h.type.create(
          { ...f, rowspan: h.attrs.rowspan - 1 },
          h.content
        ), m = e.positionAt(i + 1, c, t);
        n.insert(n.mapping.slice(l).map(r + m), p), c += f.colspan - 1;
      }
    }
  }
}
function fI(n, e) {
  if (!yt(n)) return !1;
  if (e) {
    const t = Pn(n), r = n.tr;
    if (t.top == 0 && t.bottom == t.map.height) return !1;
    for (let i = t.bottom - 1; hI(r, t, i), i != t.top; i--) {
      const o = t.tableStart ? r.doc.nodeAt(t.tableStart - 1) : r.doc;
      if (!o)
        throw RangeError("No table found");
      t.table = o, t.map = re.get(t.table);
    }
    e(r);
  }
  return !0;
}
function pI(n, e) {
  return function(t, r) {
    if (!yt(t)) return !1;
    const i = Ml(t);
    if (i.nodeAfter.attrs[n] === e) return !1;
    if (r) {
      const o = t.tr;
      t.selection instanceof ue ? t.selection.forEachCell((s, l) => {
        s.attrs[n] !== e && o.setNodeMarkup(l, null, {
          ...s.attrs,
          [n]: e
        });
      }) : o.setNodeMarkup(i.pos, null, {
        ...i.nodeAfter.attrs,
        [n]: e
      }), r(o);
    }
    return !0;
  };
}
function mI(n) {
  return function(e, t) {
    if (!yt(e)) return !1;
    if (t) {
      const r = mt(e.schema), i = Pn(e), o = e.tr, s = i.map.cellsInRect(
        n == "column" ? {
          left: i.left,
          top: 0,
          right: i.right,
          bottom: i.map.height
        } : n == "row" ? {
          left: 0,
          top: i.top,
          right: i.map.width,
          bottom: i.bottom
        } : i
      ), l = s.map((a) => i.table.nodeAt(a));
      for (let a = 0; a < s.length; a++)
        l[a].type == r.header_cell && o.setNodeMarkup(
          i.tableStart + s[a],
          r.cell,
          l[a].attrs
        );
      if (o.steps.length == 0)
        for (let a = 0; a < s.length; a++)
          o.setNodeMarkup(
            i.tableStart + s[a],
            r.header_cell,
            l[a].attrs
          );
      t(o);
    }
    return !0;
  };
}
function Nf(n, e, t) {
  const r = e.map.cellsInRect({
    left: 0,
    top: 0,
    right: n == "row" ? e.map.width : 1,
    bottom: n == "column" ? e.map.height : 1
  });
  for (let i = 0; i < r.length; i++) {
    const o = e.table.nodeAt(r[i]);
    if (o && o.type !== t.header_cell)
      return !1;
  }
  return !0;
}
function Zu(n, e) {
  return e = e || { useDeprecatedLogic: !1 }, e.useDeprecatedLogic ? mI(n) : function(t, r) {
    if (!yt(t)) return !1;
    if (r) {
      const i = mt(t.schema), o = Pn(t), s = t.tr, l = Nf("row", o, i), a = Nf(
        "column",
        o,
        i
      ), u = (n === "column" ? l : n === "row" ? a : !1) ? 1 : 0, d = n == "column" ? {
        left: 0,
        top: u,
        right: 1,
        bottom: o.map.height
      } : n == "row" ? {
        left: u,
        top: 0,
        right: o.map.width,
        bottom: 1
      } : o, h = n == "column" ? a ? i.cell : i.header_cell : n == "row" ? l ? i.cell : i.header_cell : i.cell;
      o.map.cellsInRect(d).forEach((f) => {
        const p = f + o.tableStart, m = s.doc.nodeAt(p);
        m && s.setNodeMarkup(p, h, m.attrs);
      }), r(s);
    }
    return !0;
  };
}
Zu("row", {
  useDeprecatedLogic: !0
});
Zu("column", {
  useDeprecatedLogic: !0
});
Zu("cell", {
  useDeprecatedLogic: !0
});
function gI(n, e) {
  if (e < 0) {
    const t = n.nodeBefore;
    if (t) return n.pos - t.nodeSize;
    for (let r = n.index(-1) - 1, i = n.before(); r >= 0; r--) {
      const o = n.node(-1).child(r), s = o.lastChild;
      if (s)
        return i - 1 - s.nodeSize;
      i -= o.nodeSize;
    }
  } else {
    if (n.index() < n.parent.childCount - 1)
      return n.pos + n.nodeAfter.nodeSize;
    const t = n.node(-1);
    for (let r = n.indexAfter(-1), i = n.after(); r < t.childCount; r++) {
      const o = t.child(r);
      if (o.childCount) return i + 1;
      i += o.nodeSize;
    }
  }
  return null;
}
function Ty(n) {
  return function(e, t) {
    if (!yt(e)) return !1;
    const r = gI(Ml(e), n);
    if (r == null) return !1;
    if (t) {
      const i = e.doc.resolve(r);
      t(
        e.tr.setSelection(J.between(i, WN(i))).scrollIntoView()
      );
    }
    return !0;
  };
}
function yI(n, e) {
  const t = n.selection.$anchor;
  for (let r = t.depth; r > 0; r--)
    if (t.node(r).type.spec.tableRole == "table")
      return e && e(
        n.tr.delete(t.before(r), t.after(r)).scrollIntoView()
      ), !0;
  return !1;
}
function Qo(n, e) {
  const t = n.selection;
  if (!(t instanceof ue)) return !1;
  if (e) {
    const r = n.tr, i = mt(n.schema).cell.createAndFill().content;
    t.forEachCell((o, s) => {
      o.content.eq(i) || r.replace(
        r.mapping.map(s + 1),
        r.mapping.map(s + o.nodeSize - 1),
        new R(i, 0, 0)
      );
    }), r.docChanged && e(r);
  }
  return !0;
}
function bI(n) {
  return (e, t) => {
    const {
      from: r,
      to: i,
      select: o = !0,
      pos: s = e.selection.from
    } = n, l = e.tr;
    return sI({ tr: l, originIndex: r, targetIndex: i, select: o, pos: s }) ? (t?.(l), !0) : !1;
  };
}
function kI(n) {
  return (e, t) => {
    const {
      from: r,
      to: i,
      select: o = !0,
      pos: s = e.selection.from
    } = n, l = e.tr;
    return iI({ tr: l, originIndex: r, targetIndex: i, select: o, pos: s }) ? (t?.(l), !0) : !1;
  };
}
function wI(n) {
  if (!n.size) return null;
  let { content: e, openStart: t, openEnd: r } = n;
  for (; e.childCount == 1 && (t > 0 && r > 0 || e.child(0).type.spec.tableRole == "table"); )
    t--, r--, e = e.child(0).content;
  const i = e.child(0), o = i.type.spec.tableRole, s = i.type.schema, l = [];
  if (o == "row")
    for (let a = 0; a < e.childCount; a++) {
      let c = e.child(a).content;
      const u = a ? 0 : Math.max(0, t - 1), d = a < e.childCount - 1 ? 0 : Math.max(0, r - 1);
      (u || d) && (c = Ec(
        mt(s).row,
        new R(c, u, d)
      ).content), l.push(c);
    }
  else if (o == "cell" || o == "header_cell")
    l.push(
      t || r ? Ec(
        mt(s).row,
        new R(e, t, r)
      ).content : e
    );
  else
    return null;
  return CI(s, l);
}
function CI(n, e) {
  const t = [];
  for (let i = 0; i < e.length; i++) {
    const o = e[i];
    for (let s = o.childCount - 1; s >= 0; s--) {
      const { rowspan: l, colspan: a } = o.child(s).attrs;
      for (let c = i; c < i + l; c++)
        t[c] = (t[c] || 0) + a;
    }
  }
  let r = 0;
  for (let i = 0; i < t.length; i++) r = Math.max(r, t[i]);
  for (let i = 0; i < t.length; i++)
    if (i >= e.length && e.push(N.empty), t[i] < r) {
      const o = mt(n).cell.createAndFill(), s = [];
      for (let l = t[i]; l < r; l++)
        s.push(o);
      e[i] = e[i].append(N.from(s));
    }
  return { height: e.length, width: r, rows: e };
}
function Ec(n, e) {
  const t = n.createAndFill();
  return new jm(t).replace(0, t.content.size, e).doc;
}
function SI({ width: n, height: e, rows: t }, r, i) {
  if (n != r) {
    const o = [], s = [];
    for (let l = 0; l < t.length; l++) {
      const a = t[l], c = [];
      for (let u = o[l] || 0, d = 0; u < r; d++) {
        let h = a.child(d % a.childCount);
        u + h.attrs.colspan > r && (h = h.type.createChecked(
          dr(
            h.attrs,
            h.attrs.colspan,
            u + h.attrs.colspan - r
          ),
          h.content
        )), c.push(h), u += h.attrs.colspan;
        for (let f = 1; f < h.attrs.rowspan; f++)
          o[l + f] = (o[l + f] || 0) + h.attrs.colspan;
      }
      s.push(N.from(c));
    }
    t = s, n = r;
  }
  if (e != i) {
    const o = [];
    for (let s = 0, l = 0; s < i; s++, l++) {
      const a = [], c = t[l % e];
      for (let u = 0; u < c.childCount; u++) {
        let d = c.child(u);
        s + d.attrs.rowspan > i && (d = d.type.create(
          {
            ...d.attrs,
            rowspan: Math.max(1, i - d.attrs.rowspan)
          },
          d.content
        )), a.push(d);
      }
      o.push(N.from(a));
    }
    t = o, e = i;
  }
  return { width: n, height: e, rows: t };
}
function xI(n, e, t, r, i, o, s) {
  const l = n.doc.type.schema, a = mt(l);
  let c, u;
  if (i > e.width)
    for (let d = 0, h = 0; d < e.height; d++) {
      const f = t.child(d);
      h += f.nodeSize;
      const p = [];
      let m;
      f.lastChild == null || f.lastChild.type == a.cell ? m = c || (c = a.cell.createAndFill()) : m = u || (u = a.header_cell.createAndFill());
      for (let y = e.width; y < i; y++) p.push(m);
      n.insert(n.mapping.slice(s).map(h - 1 + r), p);
    }
  if (o > e.height) {
    const d = [];
    for (let p = 0, m = (e.height - 1) * e.width; p < Math.max(e.width, i); p++) {
      const y = p >= e.width ? !1 : t.nodeAt(e.map[m + p]).type == a.header_cell;
      d.push(
        y ? u || (u = a.header_cell.createAndFill()) : c || (c = a.cell.createAndFill())
      );
    }
    const h = a.row.create(null, N.from(d)), f = [];
    for (let p = e.height; p < o; p++) f.push(h);
    n.insert(n.mapping.slice(s).map(r + t.nodeSize - 2), f);
  }
  return !!(c || u);
}
function If(n, e, t, r, i, o, s, l) {
  if (s == 0 || s == e.height) return !1;
  let a = !1;
  for (let c = i; c < o; c++) {
    const u = s * e.width + c, d = e.map[u];
    if (e.map[u - e.width] == d) {
      a = !0;
      const h = t.nodeAt(d), { top: f, left: p } = e.findCell(d);
      n.setNodeMarkup(n.mapping.slice(l).map(d + r), null, {
        ...h.attrs,
        rowspan: s - f
      }), n.insert(
        n.mapping.slice(l).map(e.positionAt(s, p, t)),
        h.type.createAndFill({
          ...h.attrs,
          rowspan: f + h.attrs.rowspan - s
        })
      ), c += h.attrs.colspan - 1;
    }
  }
  return a;
}
function Af(n, e, t, r, i, o, s, l) {
  if (s == 0 || s == e.width) return !1;
  let a = !1;
  for (let c = i; c < o; c++) {
    const u = c * e.width + s, d = e.map[u];
    if (e.map[u - 1] == d) {
      a = !0;
      const h = t.nodeAt(d), f = e.colCount(d), p = n.mapping.slice(l).map(d + r);
      n.setNodeMarkup(
        p,
        null,
        dr(
          h.attrs,
          s - f,
          h.attrs.colspan - (s - f)
        )
      ), n.insert(
        p + h.nodeSize,
        h.type.createAndFill(
          dr(h.attrs, 0, s - f)
        )
      ), c += h.attrs.rowspan - 1;
    }
  }
  return a;
}
function Of(n, e, t, r, i) {
  let o = t ? n.doc.nodeAt(t - 1) : n.doc;
  if (!o)
    throw new Error("No table found");
  let s = re.get(o);
  const { top: l, left: a } = r, c = a + i.width, u = l + i.height, d = n.tr;
  let h = 0;
  function f() {
    if (o = t ? d.doc.nodeAt(t - 1) : d.doc, !o)
      throw new Error("No table found");
    s = re.get(o), h = d.mapping.maps.length;
  }
  xI(d, s, o, t, c, u, h) && f(), If(d, s, o, t, a, c, l, h) && f(), If(d, s, o, t, a, c, u, h) && f(), Af(d, s, o, t, l, u, a, h) && f(), Af(d, s, o, t, l, u, c, h) && f();
  for (let p = l; p < u; p++) {
    const m = s.positionAt(p, a, o), y = s.positionAt(p, c, o);
    d.replace(
      d.mapping.slice(h).map(m + t),
      d.mapping.slice(h).map(y + t),
      new R(i.rows[p - l], 0, 0)
    );
  }
  f(), d.setSelection(
    new ue(
      d.doc.resolve(t + s.positionAt(l, a, o)),
      d.doc.resolve(t + s.positionAt(u - 1, c - 1, o))
    )
  ), e(d);
}
var vI = rg({
  ArrowLeft: Zo("horiz", -1),
  ArrowRight: Zo("horiz", 1),
  ArrowUp: Zo("vert", -1),
  ArrowDown: Zo("vert", 1),
  "Shift-ArrowLeft": es("horiz", -1),
  "Shift-ArrowRight": es("horiz", 1),
  "Shift-ArrowUp": es("vert", -1),
  "Shift-ArrowDown": es("vert", 1),
  Backspace: Qo,
  "Mod-Backspace": Qo,
  Delete: Qo,
  "Mod-Delete": Qo
});
function Ms(n, e, t) {
  return t.eq(n.selection) ? !1 : (e && e(n.tr.setSelection(t).scrollIntoView()), !0);
}
function Zo(n, e) {
  return (t, r, i) => {
    if (!i) return !1;
    const o = t.selection;
    if (o instanceof ue)
      return Ms(
        t,
        r,
        U.near(o.$headCell, e)
      );
    if (n != "horiz" && !o.empty) return !1;
    const s = Ny(i, n, e);
    if (s == null) return !1;
    if (n == "horiz")
      return Ms(
        t,
        r,
        U.near(t.doc.resolve(o.head + e), e)
      );
    {
      const l = t.doc.resolve(s), a = wy(l, n, e);
      let c;
      return a ? c = U.near(a, 1) : e < 0 ? c = U.near(t.doc.resolve(l.before(-1)), -1) : c = U.near(t.doc.resolve(l.after(-1)), 1), Ms(t, r, c);
    }
  };
}
function es(n, e) {
  return (t, r, i) => {
    if (!i) return !1;
    const o = t.selection;
    let s;
    if (o instanceof ue)
      s = o;
    else {
      const a = Ny(i, n, e);
      if (a == null) return !1;
      s = new ue(t.doc.resolve(a));
    }
    const l = wy(s.$headCell, n, e);
    return l ? Ms(
      t,
      r,
      new ue(s.$anchorCell, l)
    ) : !1;
  };
}
function EI(n, e) {
  const t = n.state.doc, r = Lo(t.resolve(e));
  return r ? (n.dispatch(n.state.tr.setSelection(new ue(r))), !0) : !1;
}
function MI(n, e, t) {
  if (!yt(n.state)) return !1;
  let r = wI(t);
  const i = n.state.selection;
  if (i instanceof ue) {
    r || (r = {
      width: 1,
      height: 1,
      rows: [
        N.from(
          Ec(mt(n.state.schema).cell, t)
        )
      ]
    });
    const o = i.$anchorCell.node(-1), s = i.$anchorCell.start(-1), l = re.get(o).rectBetween(
      i.$anchorCell.pos - s,
      i.$headCell.pos - s
    );
    return r = SI(r, l.right - l.left, l.bottom - l.top), Of(n.state, n.dispatch, s, l, r), !0;
  } else if (r) {
    const o = Ml(n.state), s = o.start(-1);
    return Of(
      n.state,
      n.dispatch,
      s,
      re.get(o.node(-1)).findCell(o.pos - s),
      r
    ), !0;
  } else
    return !1;
}
function TI(n, e) {
  var t;
  if (e.ctrlKey || e.metaKey) return;
  const r = Rf(n, e.target);
  let i;
  if (e.shiftKey && n.state.selection instanceof ue)
    o(n.state.selection.$anchorCell, e), e.preventDefault();
  else if (e.shiftKey && r && (i = Lo(n.state.selection.$anchor)) != null && ((t = va(n, e)) == null ? void 0 : t.pos) != i.pos)
    o(i, e), e.preventDefault();
  else if (!r)
    return;
  function o(a, c) {
    let u = va(n, c);
    const d = gn.getState(n.state) == null;
    if (!u || !Qu(a, u))
      if (d) u = a;
      else return;
    const h = new ue(a, u);
    if (d || !n.state.selection.eq(h)) {
      const f = n.state.tr.setSelection(h);
      d && f.setMeta(gn, a.pos), n.dispatch(f);
    }
  }
  function s() {
    n.root.removeEventListener("mouseup", s), n.root.removeEventListener("dragstart", s), n.root.removeEventListener("mousemove", l), gn.getState(n.state) != null && n.dispatch(n.state.tr.setMeta(gn, -1));
  }
  function l(a) {
    const c = a, u = gn.getState(n.state);
    let d;
    if (u != null)
      d = n.state.doc.resolve(u);
    else if (Rf(n, c.target) != r && (d = va(n, e), !d))
      return s();
    d && o(d, c);
  }
  n.root.addEventListener("mouseup", s), n.root.addEventListener("dragstart", s), n.root.addEventListener("mousemove", l);
}
function Ny(n, e, t) {
  if (!(n.state.selection instanceof J)) return null;
  const { $head: r } = n.state.selection;
  for (let i = r.depth - 1; i >= 0; i--) {
    const o = r.node(i);
    if ((t < 0 ? r.index(i) : r.indexAfter(i)) != (t < 0 ? 0 : o.childCount)) return null;
    if (o.type.spec.tableRole == "cell" || o.type.spec.tableRole == "header_cell") {
      const l = r.before(i), a = e == "vert" ? t > 0 ? "down" : "up" : t > 0 ? "right" : "left";
      return n.endOfTextblock(a) ? l : null;
    }
  }
  return null;
}
function Rf(n, e) {
  for (; e && e != n.dom; e = e.parentNode)
    if (e.nodeName == "TD" || e.nodeName == "TH")
      return e;
  return null;
}
function va(n, e) {
  const t = n.posAtCoords({
    left: e.clientX,
    top: e.clientY
  });
  return t && t ? Lo(n.state.doc.resolve(t.pos)) : null;
}
var NI = class {
  constructor(n, e) {
    this.node = n, this.defaultCellMinWidth = e, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty(
      "--default-cell-min-width",
      `${e}px`
    ), this.colgroup = this.table.appendChild(document.createElement("colgroup")), Mc(n, this.colgroup, this.table, e), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(n) {
    return n.type != this.node.type ? !1 : (this.node = n, Mc(
      n,
      this.colgroup,
      this.table,
      this.defaultCellMinWidth
    ), !0);
  }
  ignoreMutation(n) {
    return n.type == "attributes" && (n.target == this.table || this.colgroup.contains(n.target));
  }
};
function Mc(n, e, t, r, i, o) {
  var s;
  let l = 0, a = !0, c = e.firstChild;
  const u = n.firstChild;
  if (u) {
    for (let d = 0, h = 0; d < u.childCount; d++) {
      const { colspan: f, colwidth: p } = u.child(d).attrs;
      for (let m = 0; m < f; m++, h++) {
        const y = i == h ? o : p && p[m], g = y ? y + "px" : "";
        if (l += y || r, y || (a = !1), c)
          c.style.width != g && (c.style.width = g), c = c.nextSibling;
        else {
          const C = document.createElement("col");
          C.style.width = g, e.appendChild(C);
        }
      }
    }
    for (; c; ) {
      const d = c.nextSibling;
      (s = c.parentNode) == null || s.removeChild(c), c = d;
    }
    a ? (t.style.width = l + "px", t.style.minWidth = "") : (t.style.width = "", t.style.minWidth = l + "px");
  }
}
var Ze = new ge(
  "tableColumnResizing"
);
function II({
  handleWidth: n = 5,
  cellMinWidth: e = 25,
  defaultCellMinWidth: t = 100,
  View: r = NI,
  lastColumnResizable: i = !0
} = {}) {
  const o = new xe({
    key: Ze,
    state: {
      init(s, l) {
        var a, c;
        const u = (c = (a = o.spec) == null ? void 0 : a.props) == null ? void 0 : c.nodeViews, d = mt(l.schema).table.name;
        return r && u && (u[d] = (h, f) => new r(h, t, f)), new AI(-1, !1);
      },
      apply(s, l) {
        return l.apply(s);
      }
    },
    props: {
      attributes: (s) => {
        const l = Ze.getState(s);
        return l && l.activeHandle > -1 ? { class: "resize-cursor" } : {};
      },
      handleDOMEvents: {
        mousemove: (s, l) => {
          OI(s, l, n, i);
        },
        mouseleave: (s) => {
          RI(s);
        },
        mousedown: (s, l) => {
          DI(s, l, e, t);
        }
      },
      decorations: (s) => {
        const l = Ze.getState(s);
        if (l && l.activeHandle > -1)
          return zI(s, l.activeHandle);
      },
      nodeViews: {}
    }
  });
  return o;
}
var AI = class Ts {
  constructor(e, t) {
    this.activeHandle = e, this.dragging = t;
  }
  apply(e) {
    const t = this, r = e.getMeta(Ze);
    if (r && r.setHandle != null)
      return new Ts(r.setHandle, !1);
    if (r && r.setDragging !== void 0)
      return new Ts(t.activeHandle, r.setDragging);
    if (t.activeHandle > -1 && e.docChanged) {
      let i = e.mapping.map(t.activeHandle, -1);
      return vc(e.doc.resolve(i)) || (i = -1), new Ts(i, t.dragging);
    }
    return t;
  }
};
function OI(n, e, t, r) {
  if (!n.editable) return;
  const i = Ze.getState(n.state);
  if (i && !i.dragging) {
    const o = PI(e.target);
    let s = -1;
    if (o) {
      const { left: l, right: a } = o.getBoundingClientRect();
      e.clientX - l <= t ? s = Df(n, e, "left", t) : a - e.clientX <= t && (s = Df(n, e, "right", t));
    }
    if (s != i.activeHandle) {
      if (!r && s !== -1) {
        const l = n.state.doc.resolve(s), a = l.node(-1), c = re.get(a), u = l.start(-1);
        if (c.colCount(l.pos - u) + l.nodeAfter.attrs.colspan - 1 == c.width - 1)
          return;
      }
      Iy(n, s);
    }
  }
}
function RI(n) {
  if (!n.editable) return;
  const e = Ze.getState(n.state);
  e && e.activeHandle > -1 && !e.dragging && Iy(n, -1);
}
function DI(n, e, t, r) {
  var i;
  if (!n.editable) return !1;
  const o = (i = n.dom.ownerDocument.defaultView) != null ? i : window, s = Ze.getState(n.state);
  if (!s || s.activeHandle == -1 || s.dragging)
    return !1;
  const l = n.state.doc.nodeAt(s.activeHandle), a = LI(n, s.activeHandle, l.attrs);
  n.dispatch(
    n.state.tr.setMeta(Ze, {
      setDragging: { startX: e.clientX, startWidth: a }
    })
  );
  function c(d) {
    o.removeEventListener("mouseup", c), o.removeEventListener("mousemove", u);
    const h = Ze.getState(n.state);
    h?.dragging && (BI(
      n,
      h.activeHandle,
      Lf(h.dragging, d, t)
    ), n.dispatch(
      n.state.tr.setMeta(Ze, { setDragging: null })
    ));
  }
  function u(d) {
    if (!d.which) return c(d);
    const h = Ze.getState(n.state);
    if (h && h.dragging) {
      const f = Lf(h.dragging, d, t);
      Pf(
        n,
        h.activeHandle,
        f,
        r
      );
    }
  }
  return Pf(
    n,
    s.activeHandle,
    a,
    r
  ), o.addEventListener("mouseup", c), o.addEventListener("mousemove", u), e.preventDefault(), !0;
}
function LI(n, e, { colspan: t, colwidth: r }) {
  const i = r && r[r.length - 1];
  if (i) return i;
  const o = n.domAtPos(e);
  let l = o.node.childNodes[o.offset].offsetWidth, a = t;
  if (r)
    for (let c = 0; c < t; c++)
      r[c] && (l -= r[c], a--);
  return l / a;
}
function PI(n) {
  for (; n && n.nodeName != "TD" && n.nodeName != "TH"; )
    n = n.classList && n.classList.contains("ProseMirror") ? null : n.parentNode;
  return n;
}
function Df(n, e, t, r) {
  const i = t == "right" ? -r : r, o = n.posAtCoords({
    left: e.clientX + i,
    top: e.clientY
  });
  if (!o) return -1;
  const { pos: s } = o, l = Lo(n.state.doc.resolve(s));
  if (!l) return -1;
  if (t == "right") return l.pos;
  const a = re.get(l.node(-1)), c = l.start(-1), u = a.map.indexOf(l.pos - c);
  return u % a.width == 0 ? -1 : c + a.map[u - 1];
}
function Lf(n, e, t) {
  const r = e.clientX - n.startX;
  return Math.max(t, n.startWidth + r);
}
function Iy(n, e) {
  n.dispatch(
    n.state.tr.setMeta(Ze, { setHandle: e })
  );
}
function BI(n, e, t) {
  const r = n.state.doc.resolve(e), i = r.node(-1), o = re.get(i), s = r.start(-1), l = o.colCount(r.pos - s) + r.nodeAfter.attrs.colspan - 1, a = n.state.tr;
  for (let c = 0; c < o.height; c++) {
    const u = c * o.width + l;
    if (c && o.map[u] == o.map[u - o.width]) continue;
    const d = o.map[u], h = i.nodeAt(d).attrs, f = h.colspan == 1 ? 0 : l - o.colCount(d);
    if (h.colwidth && h.colwidth[f] == t) continue;
    const p = h.colwidth ? h.colwidth.slice() : $I(h.colspan);
    p[f] = t, a.setNodeMarkup(s + d, null, { ...h, colwidth: p });
  }
  a.docChanged && n.dispatch(a);
}
function Pf(n, e, t, r) {
  const i = n.state.doc.resolve(e), o = i.node(-1), s = i.start(-1), l = re.get(o).colCount(i.pos - s) + i.nodeAfter.attrs.colspan - 1;
  let a = n.domAtPos(i.start(-1)).node;
  for (; a && a.nodeName != "TABLE"; )
    a = a.parentNode;
  a && Mc(
    o,
    a.firstChild,
    a,
    r,
    l,
    t
  );
}
function $I(n) {
  return Array(n).fill(0);
}
function zI(n, e) {
  var t;
  const r = [], i = n.doc.resolve(e), o = i.node(-1);
  if (!o)
    return se.empty;
  const s = re.get(o), l = i.start(-1), a = s.colCount(i.pos - l) + i.nodeAfter.attrs.colspan - 1;
  for (let c = 0; c < s.height; c++) {
    const u = a + c * s.width;
    if ((a == s.width - 1 || s.map[u] != s.map[u + 1]) && (c == 0 || s.map[u] != s.map[u - s.width])) {
      const d = s.map[u], h = l + d + o.nodeAt(d).nodeSize - 1, f = document.createElement("div");
      f.className = "column-resize-handle", (t = Ze.getState(n)) != null && t.dragging && r.push(
        Ce.node(
          l + d,
          l + d + o.nodeAt(d).nodeSize,
          {
            class: "column-resize-dragging"
          }
        )
      ), r.push(Ce.widget(h, f));
    }
  }
  return se.create(n.doc, r);
}
function FI({
  allowTableNodeSelection: n = !1
} = {}) {
  return new xe({
    key: gn,
    // This piece of state is used to remember when a mouse-drag
    // cell-selection is happening, so that it can continue even as
    // transactions (which might move its anchor cell) come in.
    state: {
      init() {
        return null;
      },
      apply(e, t) {
        const r = e.getMeta(gn);
        if (r != null) return r == -1 ? null : r;
        if (t == null || !e.docChanged) return t;
        const { deleted: i, pos: o } = e.mapping.mapResult(t);
        return i ? null : o;
      }
    },
    props: {
      decorations: YN,
      handleDOMEvents: {
        mousedown: TI
      },
      createSelectionBetween(e) {
        return gn.getState(e.state) != null ? e.state.selection : null;
      },
      handleTripleClick: EI,
      handleKeyDown: vI,
      handlePaste: MI
    },
    appendTransaction(e, t, r) {
      return ZN(
        r,
        tI(r, t),
        n
      );
    }
  });
}
var Ys = typeof navigator < "u" ? navigator : null, ed = Ys && Ys.userAgent || "", _I = /Edge\/(\d+)/.exec(ed), HI = /MSIE \d/.exec(ed), qI = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(ed), jI = !!(HI || qI || _I), VI = !jI && !!Ys && /Apple Computer/.test(Ys.vendor), Ay = new ge("safari-ime-span"), Tc = !1, UI = {
  key: Ay,
  props: {
    decorations: WI,
    handleDOMEvents: {
      compositionstart: () => {
        Tc = !0;
      },
      compositionend: () => {
        Tc = !1;
      }
    }
  }
};
function WI(n) {
  const { $from: e, $to: t, to: r } = n.selection;
  if (Tc && e.sameParent(t)) {
    const i = Ce.widget(r, KI, {
      ignoreSelection: !0,
      key: "safari-ime-span"
    });
    return se.create(n.doc, [i]);
  }
}
function KI(n) {
  const e = n.dom.ownerDocument.createElement("span");
  return e.className = "ProseMirror-safari-ime-span", e;
}
var JI = new xe(VI ? UI : { key: Ay });
function _(n, e) {
  return Object.assign(n, {
    meta: {
      package: "@milkdown/preset-gfm",
      ...e
    }
  }), n;
}
const td = Io("strike_through");
_(td, {
  displayName: "Attr<strikethrough>",
  group: "Strikethrough"
});
const Bo = ci("strike_through", (n) => ({
  parseDOM: [
    { tag: "del" },
    {
      style: "text-decoration",
      getAttrs: (e) => e === "line-through"
    }
  ],
  toDOM: (e) => ["del", n.get(td.key)(e)],
  parseMarkdown: {
    match: (e) => e.type === "delete",
    runner: (e, t, r) => {
      e.openMark(r), e.next(t.children), e.closeMark(r);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === "strike_through",
    runner: (e, t) => {
      e.withMark(t, "delete");
    }
  }
}));
_(Bo.mark, {
  displayName: "MarkSchema<strikethrough>",
  group: "Strikethrough"
});
_(Bo.ctx, {
  displayName: "MarkSchemaCtx<strikethrough>",
  group: "Strikethrough"
});
const Tl = j(
  "ToggleStrikeThrough",
  (n) => () => Qt(Bo.type(n))
);
_(Tl, {
  displayName: "Command<ToggleStrikethrough>",
  group: "Strikethrough"
});
const Oy = Je((n) => Eo(
  new RegExp("(?<![\\w:/])(~{1,2})(.+?)\\1(?!\\w|\\/)"),
  Bo.type(n)
));
_(Oy, {
  displayName: "InputRule<strikethrough>",
  group: "Strikethrough"
});
const nd = Fe("strikeThroughKeymap", {
  ToggleStrikethrough: {
    shortcuts: "Mod-Alt-x",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Tl.key);
    }
  }
});
_(nd.ctx, {
  displayName: "KeymapCtx<strikethrough>",
  group: "Strikethrough"
});
_(nd.shortcuts, {
  displayName: "Keymap<strikethrough>",
  group: "Strikethrough"
});
const $o = VN({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: {
    alignment: {
      default: "left",
      getFromDOM: (n) => n.style.textAlign || "left",
      setDOMAttr: (n, e) => {
        e.style = `text-align: ${n || "left"}`;
      }
    }
  }
}), mr = ye("table", () => ({
  ...$o.table,
  content: "table_header_row table_row+",
  disableDropCursor: !0,
  parseMarkdown: {
    match: (n) => n.type === "table",
    runner: (n, e, t) => {
      const r = e.align, i = e.children.map((o, s) => ({
        ...o,
        align: r,
        isHeader: s === 0
      }));
      n.openNode(t), n.next(i), n.closeNode();
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "table",
    runner: (n, e) => {
      const t = e.content.firstChild?.content;
      if (!t) return;
      const r = [];
      t.forEach((i) => {
        r.push(i.attrs.alignment);
      }), n.openNode("table", void 0, { align: r }), n.next(e.content), n.closeNode();
    }
  }
}));
_(mr.node, {
  displayName: "NodeSchema<table>",
  group: "Table"
});
_(mr.ctx, {
  displayName: "NodeSchemaCtx<table>",
  group: "Table"
});
const Nl = ye("table_header_row", () => ({
  ...$o.table_row,
  disableDropCursor: !0,
  content: "(table_header)*",
  parseDOM: [{ tag: "tr[data-is-header]" }],
  toDOM() {
    return ["tr", { "data-is-header": !0 }, 0];
  },
  parseMarkdown: {
    match: (n) => !!(n.type === "tableRow" && n.isHeader),
    runner: (n, e, t) => {
      const r = e.align, i = e.children.map((o, s) => ({
        ...o,
        align: r[s],
        isHeader: e.isHeader
      }));
      n.openNode(t), n.next(i), n.closeNode();
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "table_header_row",
    runner: (n, e) => {
      n.openNode("tableRow", void 0, { isHeader: !0 }), n.next(e.content), n.closeNode();
    }
  }
}));
_(Nl.node, {
  displayName: "NodeSchema<tableHeaderRow>",
  group: "Table"
});
_(Nl.ctx, {
  displayName: "NodeSchemaCtx<tableHeaderRow>",
  group: "Table"
});
const zo = ye("table_row", () => ({
  ...$o.table_row,
  disableDropCursor: !0,
  content: "(table_cell)*",
  parseMarkdown: {
    match: (n) => n.type === "tableRow",
    runner: (n, e, t) => {
      const r = e.align, i = e.children.map((o, s) => ({
        ...o,
        align: r[s]
      }));
      n.openNode(t), n.next(i), n.closeNode();
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "table_row",
    runner: (n, e) => {
      e.content.size !== 0 && (n.openNode("tableRow"), n.next(e.content), n.closeNode());
    }
  }
}));
_(zo.node, {
  displayName: "NodeSchema<tableRow>",
  group: "Table"
});
_(zo.ctx, {
  displayName: "NodeSchemaCtx<tableRow>",
  group: "Table"
});
const Fo = ye("table_cell", () => ({
  ...$o.table_cell,
  disableDropCursor: !0,
  parseMarkdown: {
    match: (n) => n.type === "tableCell" && !n.isHeader,
    runner: (n, e, t) => {
      const r = e.align;
      n.openNode(t, { alignment: r }).openNode(n.schema.nodes.paragraph).next(e.children).closeNode().closeNode();
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "table_cell",
    runner: (n, e) => {
      n.openNode("tableCell").next(e.content).closeNode();
    }
  }
}));
_(Fo.node, {
  displayName: "NodeSchema<tableCell>",
  group: "Table"
});
_(Fo.ctx, {
  displayName: "NodeSchemaCtx<tableCell>",
  group: "Table"
});
const _o = ye("table_header", () => ({
  ...$o.table_header,
  disableDropCursor: !0,
  parseMarkdown: {
    match: (n) => n.type === "tableCell" && !!n.isHeader,
    runner: (n, e, t) => {
      const r = e.align;
      n.openNode(t, { alignment: r }), n.openNode(n.schema.nodes.paragraph), n.next(e.children), n.closeNode(), n.closeNode();
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === "table_header",
    runner: (n, e) => {
      n.openNode("tableCell"), n.next(e.content), n.closeNode();
    }
  }
}));
_(_o.node, {
  displayName: "NodeSchema<tableHeader>",
  group: "Table"
});
_(_o.ctx, {
  displayName: "NodeSchemaCtx<tableHeader>",
  group: "Table"
});
function Ry(n, e = 3, t = 3) {
  const r = Array(t).fill(0).map(() => Fo.type(n).createAndFill()), i = Array(t).fill(0).map(() => _o.type(n).createAndFill()), o = Array(e).fill(0).map(
    (s, l) => l === 0 ? Nl.type(n).create(null, i) : zo.type(n).create(null, r)
  );
  return mr.type(n).create(null, o);
}
function Dy(n) {
  return (e, t) => (r) => {
    t = t ?? r.selection.from;
    const i = r.doc.resolve(t), o = nM(
      (a) => a.type.name === "table"
    )(i), s = o ? {
      node: o.node,
      from: o.start
    } : void 0, l = n === "row";
    if (s) {
      const a = re.get(s.node);
      if (e >= 0 && e < (l ? a.height : a.width)) {
        const c = a.positionAt(
          l ? e : a.height - 1,
          l ? a.width - 1 : e,
          s.node
        ), u = r.doc.resolve(s.from + c), d = l ? ue.rowSelection : ue.colSelection, h = a.positionAt(
          l ? e : 0,
          l ? 0 : e,
          s.node
        ), f = r.doc.resolve(s.from + h);
        return ng(
          r.setSelection(
            d(u, f)
          )
        );
      }
    }
    return r;
  };
}
const GI = Dy("row"), YI = Dy("col");
function Ly(n, e, { map: t, tableStart: r, table: i }, o) {
  const s = Array(o).fill(0).reduce((a, c, u) => a + i.child(u).nodeSize, r), l = Array(t.width).fill(0).map((a, c) => {
    const u = i.nodeAt(t.map[c]);
    return Fo.type(n).createAndFill({ alignment: u?.attrs.alignment });
  });
  return e.insert(s, zo.type(n).create(null, l)), e;
}
function XI(n) {
  const e = Po(n.$from);
  if (!e) return;
  const t = re.get(e.node);
  return t.cellsInRect({
    left: 0,
    right: t.width,
    top: 0,
    bottom: t.height
  }).map((i) => {
    const o = e.node.nodeAt(i), s = i + e.start;
    return { pos: s, start: s + 1, node: o };
  });
}
function QI(n) {
  const e = XI(n.selection);
  if (e && e[0]) {
    const t = n.doc.resolve(e[0].pos), r = e[e.length - 1];
    if (r) {
      const i = n.doc.resolve(r.pos);
      return ng(n.setSelection(new ue(i, t)));
    }
  }
  return n;
}
const rd = j(
  "GoToPrevTableCell",
  () => () => Ty(-1)
);
_(rd, {
  displayName: "Command<goToPrevTableCellCommand>",
  group: "Table"
});
const id = j(
  "GoToNextTableCell",
  () => () => Ty(1)
);
_(id, {
  displayName: "Command<goToNextTableCellCommand>",
  group: "Table"
});
const od = j(
  "ExitTable",
  (n) => () => (e, t) => {
    if (!yt(e)) return !1;
    const { $head: r } = e.selection, i = tM(r, mr.type(n));
    if (!i) return !1;
    const { to: o } = i, s = e.tr.replaceWith(
      o,
      o,
      an.type(n).createAndFill()
    );
    return s.setSelection(U.near(s.doc.resolve(o), 1)).scrollIntoView(), t?.(s), !0;
  }
);
_(od, {
  displayName: "Command<breakTableCommand>",
  group: "Table"
});
const Py = j(
  "InsertTable",
  (n) => ({ row: e, col: t } = {}) => (r, i) => {
    const { selection: o, tr: s } = r, { from: l } = o, a = Ry(n, e, t), c = s.replaceSelectionWith(a), u = U.findFrom(c.doc.resolve(l), 1, !0);
    return u && c.setSelection(u), i?.(c), !0;
  }
);
_(Py, {
  displayName: "Command<insertTableCommand>",
  group: "Table"
});
const By = j(
  "MoveRow",
  () => ({ from: n, to: e, pos: t } = {}) => bI({
    from: n ?? 0,
    to: e ?? 0,
    pos: t
  })
);
_(By, {
  displayName: "Command<moveRowCommand>",
  group: "Table"
});
const $y = j(
  "MoveCol",
  () => ({ from: n, to: e, pos: t } = {}) => kI({
    from: n ?? 0,
    to: e ?? 0,
    pos: t
  })
);
_($y, {
  displayName: "Command<moveColCommand>",
  group: "Table"
});
const zy = j(
  "SelectRow",
  () => (n = { index: 0 }) => (e, t) => {
    const { tr: r } = e;
    return !!t?.(GI(n.index, n.pos)(r));
  }
);
_(zy, {
  displayName: "Command<selectRowCommand>",
  group: "Table"
});
const Fy = j(
  "SelectCol",
  () => (n = { index: 0 }) => (e, t) => {
    const { tr: r } = e;
    return !!t?.(YI(n.index, n.pos)(r));
  }
);
_(Fy, {
  displayName: "Command<selectColCommand>",
  group: "Table"
});
const _y = j(
  "SelectTable",
  () => () => (n, e) => {
    const { tr: t } = n;
    return !!e?.(QI(t));
  }
);
_(_y, {
  displayName: "Command<selectTableCommand>",
  group: "Table"
});
const Hy = j(
  "DeleteSelectedCells",
  () => () => (n, e) => {
    const { selection: t } = n;
    if (!(t instanceof ue)) return !1;
    const r = t.isRowSelection(), i = t.isColSelection();
    return r && i ? yI(n, e) : i ? dI(n, e) : fI(n, e);
  }
);
_(Hy, {
  displayName: "Command<deleteSelectedCellsCommand>",
  group: "Table"
});
const qy = j(
  "AddColBefore",
  () => () => aI
);
_(qy, {
  displayName: "Command<addColBeforeCommand>",
  group: "Table"
});
const jy = j(
  "AddColAfter",
  () => () => cI
);
_(jy, {
  displayName: "Command<addColAfterCommand>",
  group: "Table"
});
const Vy = j(
  "AddRowBefore",
  (n) => () => (e, t) => {
    if (!yt(e)) return !1;
    if (t) {
      const r = Pn(e);
      t(Ly(n, e.tr, r, r.top));
    }
    return !0;
  }
);
_(Vy, {
  displayName: "Command<addRowBeforeCommand>",
  group: "Table"
});
const Uy = j(
  "AddRowAfter",
  (n) => () => (e, t) => {
    if (!yt(e)) return !1;
    if (t) {
      const r = Pn(e);
      t(Ly(n, e.tr, r, r.bottom));
    }
    return !0;
  }
);
_(Uy, {
  displayName: "Command<addRowAfterCommand>",
  group: "Table"
});
const Wy = j(
  "SetAlign",
  () => (n = "left") => pI("alignment", n)
);
_(Wy, {
  displayName: "Command<setAlignCommand>",
  group: "Table"
});
const Ky = Je(
  (n) => new it(
    /^\|(?<col>\d+)[xX](?<row>\d+)\|\s$/,
    (e, t, r, i) => {
      const o = e.doc.resolve(r);
      if (!o.node(-1).canReplaceWith(
        o.index(-1),
        o.indexAfter(-1),
        mr.type(n)
      ))
        return null;
      const s = Math.max(Number(t.groups?.row ?? 0), 2), l = Ry(n, s, Number(t.groups?.col)), a = e.tr.replaceRangeWith(r, i, l);
      return a.setSelection(J.create(a.doc, r + 3)).scrollIntoView();
    }
  )
);
_(Ky, {
  displayName: "InputRule<insertTableInputRule>",
  group: "Table"
});
const Jy = oN((n) => ({
  run: (e, t, r) => {
    if (r)
      return e;
    let i = e.content;
    return e.content.forEach((o, s, l) => {
      if (o?.type !== mr.type(n))
        return;
      const a = o.childCount, c = o.lastChild?.childCount ?? 0;
      if (a === 0 || c === 0) {
        i = i.replaceChild(
          l,
          an.type(n).create()
        );
        return;
      }
      const u = o.firstChild;
      if (!(c > 0 && u && u.childCount === 0))
        return;
      const h = Array(c).fill(0).map(() => _o.type(n).createAndFill()), f = new R(N.from(h), 0, 0), p = u.replace(0, 0, f), m = o.replace(
        0,
        u.nodeSize,
        new R(N.from(p), 0, 0)
      );
      i = i.replaceChild(l, m);
    }), new R(N.from(i), e.openStart, e.openEnd);
  }
}));
_(Jy, {
  displayName: "PasteRule<table>",
  group: "Table"
});
const sd = Fe("tableKeymap", {
  NextCell: {
    priority: 100,
    shortcuts: ["Mod-]", "Tab"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(id.key);
    }
  },
  PrevCell: {
    shortcuts: ["Mod-[", "Shift-Tab"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(rd.key);
    }
  },
  ExitTable: {
    shortcuts: ["Mod-Enter", "Enter"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(od.key);
    }
  }
});
_(sd.ctx, {
  displayName: "KeymapCtx<table>",
  group: "Table"
});
_(sd.shortcuts, {
  displayName: "Keymap<table>",
  group: "Table"
});
const Ea = "footnote_definition", Bf = "footnoteDefinition", ld = ye(
  "footnote_definition",
  () => ({
    group: "block",
    content: "block+",
    defining: !0,
    attrs: {
      label: {
        default: "",
        validate: "string"
      }
    },
    parseDOM: [
      {
        tag: `dl[data-type="${Ea}"]`,
        getAttrs: (n) => {
          if (!(n instanceof HTMLElement)) throw Pt(n);
          return {
            label: n.dataset.label
          };
        },
        contentElement: "dd"
      }
    ],
    toDOM: (n) => {
      const e = n.attrs.label;
      return [
        "dl",
        {
          // TODO: add a prosemirror plugin to sync label on change
          "data-label": e,
          "data-type": Ea
        },
        ["dt", e],
        ["dd", 0]
      ];
    },
    parseMarkdown: {
      match: ({ type: n }) => n === Bf,
      runner: (n, e, t) => {
        n.openNode(t, {
          label: e.label
        }).next(e.children).closeNode();
      }
    },
    toMarkdown: {
      match: (n) => n.type.name === Ea,
      runner: (n, e) => {
        n.openNode(Bf, void 0, {
          label: e.attrs.label,
          identifier: e.attrs.label
        }).next(e.content).closeNode();
      }
    }
  })
);
_(ld.ctx, {
  displayName: "NodeSchemaCtx<footnodeDef>",
  group: "footnote"
});
_(ld.node, {
  displayName: "NodeSchema<footnodeDef>",
  group: "footnote"
});
const Ma = "footnote_reference", ad = ye(
  "footnote_reference",
  () => ({
    group: "inline",
    inline: !0,
    atom: !0,
    attrs: {
      label: {
        default: "",
        validate: "string"
      }
    },
    parseDOM: [
      {
        tag: `sup[data-type="${Ma}"]`,
        getAttrs: (n) => {
          if (!(n instanceof HTMLElement)) throw Pt(n);
          return {
            label: n.dataset.label
          };
        }
      }
    ],
    toDOM: (n) => {
      const e = n.attrs.label;
      return [
        "sup",
        {
          // TODO: add a prosemirror plugin to sync label on change
          "data-label": e,
          "data-type": Ma
        },
        e
      ];
    },
    parseMarkdown: {
      match: ({ type: n }) => n === "footnoteReference",
      runner: (n, e, t) => {
        n.addNode(t, {
          label: e.label
        });
      }
    },
    toMarkdown: {
      match: (n) => n.type.name === Ma,
      runner: (n, e) => {
        n.addNode("footnoteReference", void 0, void 0, {
          label: e.attrs.label,
          identifier: e.attrs.label
        });
      }
    }
  })
);
_(ad.ctx, {
  displayName: "NodeSchemaCtx<footnodeRef>",
  group: "footnote"
});
_(ad.node, {
  displayName: "NodeSchema<footnodeRef>",
  group: "footnote"
});
const cd = cn.extendSchema(
  (n) => (e) => {
    const t = n(e);
    return {
      ...t,
      attrs: {
        ...t.attrs,
        checked: {
          default: null,
          validate: "boolean|null"
        }
      },
      parseDOM: [
        {
          tag: 'li[data-item-type="task"]',
          getAttrs: (r) => {
            if (!(r instanceof HTMLElement)) throw Pt(r);
            return {
              label: r.dataset.label,
              listType: r.dataset.listType,
              spread: r.dataset.spread,
              checked: r.dataset.checked ? r.dataset.checked === "true" : null
            };
          }
        },
        ...t?.parseDOM || []
      ],
      toDOM: (r) => t.toDOM && r.attrs.checked == null ? t.toDOM(r) : [
        "li",
        {
          "data-item-type": "task",
          "data-label": r.attrs.label,
          "data-list-type": r.attrs.listType,
          "data-spread": r.attrs.spread,
          "data-checked": r.attrs.checked
        },
        0
      ],
      parseMarkdown: {
        match: ({ type: r }) => r === "listItem",
        runner: (r, i, o) => {
          if (i.checked == null) {
            t.parseMarkdown.runner(r, i, o);
            return;
          }
          const s = i.label != null ? `${i.label}.` : "•", l = i.checked != null ? !!i.checked : null, a = i.label != null ? "ordered" : "bullet", c = i.spread != null ? `${i.spread}` : "true";
          r.openNode(o, { label: s, listType: a, spread: c, checked: l }), r.next(i.children), r.closeNode();
        }
      },
      toMarkdown: {
        match: (r) => r.type.name === "list_item",
        runner: (r, i) => {
          if (i.attrs.checked == null) {
            t.toMarkdown.runner(r, i);
            return;
          }
          const o = i.attrs.label, s = i.attrs.listType, l = i.attrs.spread === "true", a = i.attrs.checked;
          r.openNode("listItem", void 0, {
            label: o,
            listType: s,
            spread: l,
            checked: a
          }), r.next(i.content), r.closeNode();
        }
      }
    };
  }
);
_(cd.node, {
  displayName: "NodeSchema<taskListItem>",
  group: "ListItem"
});
_(cd.ctx, {
  displayName: "NodeSchemaCtx<taskListItem>",
  group: "ListItem"
});
const Gy = Je(() => new it(
  /^\[(?<checked>\s|x)\]\s$/,
  (n, e, t, r) => {
    const i = n.doc.resolve(t);
    let o = 0, s = i.node(o);
    for (; s && s.type.name !== "list_item"; )
      o--, s = i.node(o);
    if (!s || s.attrs.checked != null) return null;
    const l = e.groups?.checked === "x", a = i.before(o), c = n.tr;
    return c.deleteRange(t, r).setNodeMarkup(a, void 0, {
      ...s.attrs,
      checked: l
    }), c;
  }
));
_(Gy, {
  displayName: "InputRule<wrapInTaskListInputRule>",
  group: "ListItem"
});
const ZI = [
  nd,
  sd
].flat(), eA = [
  Ky,
  Gy
], tA = [Oy], nA = [Jy], Yy = ot(() => JI);
_(Yy, {
  displayName: "Prose<autoInsertSpanPlugin>",
  group: "Prose"
});
const rA = ot(() => II({}));
_(rA, {
  displayName: "Prose<columnResizingPlugin>",
  group: "Prose"
});
const Xy = ot(
  () => FI({ allowTableNodeSelection: !0 })
);
_(Xy, {
  displayName: "Prose<tableEditingPlugin>",
  group: "Prose"
});
const ud = Ln("remarkGFM", () => _c);
_(ud.plugin, {
  displayName: "Remark<remarkGFMPlugin>",
  group: "Remark"
});
_(ud.options, {
  displayName: "RemarkConfig<remarkGFMPlugin>",
  group: "Remark"
});
const iA = new ge("MILKDOWN_KEEP_TABLE_ALIGN_PLUGIN");
function oA(n, e) {
  let t = 0;
  return e.forEach((r, i, o) => {
    r === n && (t = o);
  }), t;
}
const Qy = ot(() => new xe({
  key: iA,
  appendTransaction: (n, e, t) => {
    let r;
    const i = (o, s) => {
      if (r || (r = t.tr), o.type.name !== "table_cell") return;
      const l = t.doc.resolve(s), a = l.node(l.depth), u = l.node(l.depth - 1).firstChild;
      if (!u) return;
      const d = oA(o, a), h = u.maybeChild(d);
      if (!h) return;
      const f = h.attrs.alignment, p = o.attrs.alignment;
      f !== p && r.setNodeMarkup(s, void 0, { ...o.attrs, alignment: f });
    };
    return e.doc !== t.doc && t.doc.descendants(i), r;
  }
}));
_(Qy, {
  displayName: "Prose<keepTableAlignPlugin>",
  group: "Prose"
});
const sA = [
  Qy,
  Yy,
  ud,
  Xy
].flat(), lA = [
  cd,
  mr,
  Nl,
  zo,
  _o,
  Fo,
  ld,
  ad,
  td,
  Bo
].flat(), aA = [
  id,
  rd,
  od,
  Py,
  By,
  $y,
  zy,
  Fy,
  _y,
  Hy,
  Vy,
  Uy,
  qy,
  jy,
  Wy,
  Tl
], cA = [
  lA,
  eA,
  nA,
  tA,
  ZI,
  aA,
  sA
].flat();
var uA = typeof global == "object" && global && global.Object === Object && global, dA = typeof self == "object" && self && self.Object === Object && self, Zy = uA || dA || Function("return this")(), Xs = Zy.Symbol, eb = Object.prototype, hA = eb.hasOwnProperty, fA = eb.toString, Si = Xs ? Xs.toStringTag : void 0;
function pA(n) {
  var e = hA.call(n, Si), t = n[Si];
  try {
    n[Si] = void 0;
    var r = !0;
  } catch {
  }
  var i = fA.call(n);
  return r && (e ? n[Si] = t : delete n[Si]), i;
}
var mA = Object.prototype, gA = mA.toString;
function yA(n) {
  return gA.call(n);
}
var bA = "[object Null]", kA = "[object Undefined]", $f = Xs ? Xs.toStringTag : void 0;
function wA(n) {
  return n == null ? n === void 0 ? kA : bA : $f && $f in Object(n) ? pA(n) : yA(n);
}
function CA(n) {
  return n != null && typeof n == "object";
}
var SA = "[object Symbol]";
function xA(n) {
  return typeof n == "symbol" || CA(n) && wA(n) == SA;
}
var vA = /\s/;
function EA(n) {
  for (var e = n.length; e-- && vA.test(n.charAt(e)); )
    ;
  return e;
}
var MA = /^\s+/;
function TA(n) {
  return n && n.slice(0, EA(n) + 1).replace(MA, "");
}
function Nc(n) {
  var e = typeof n;
  return n != null && (e == "object" || e == "function");
}
var zf = NaN, NA = /^[-+]0x[0-9a-f]+$/i, IA = /^0b[01]+$/i, AA = /^0o[0-7]+$/i, OA = parseInt;
function Ff(n) {
  if (typeof n == "number")
    return n;
  if (xA(n))
    return zf;
  if (Nc(n)) {
    var e = typeof n.valueOf == "function" ? n.valueOf() : n;
    n = Nc(e) ? e + "" : e;
  }
  if (typeof n != "string")
    return n === 0 ? n : +n;
  n = TA(n);
  var t = IA.test(n);
  return t || AA.test(n) ? OA(n.slice(2), t ? 2 : 8) : NA.test(n) ? zf : +n;
}
var Ta = function() {
  return Zy.Date.now();
}, RA = "Expected a function", DA = Math.max, LA = Math.min;
function PA(n, e, t) {
  var r, i, o, s, l, a, c = 0, u = !1, d = !1, h = !0;
  if (typeof n != "function")
    throw new TypeError(RA);
  e = Ff(e) || 0, Nc(t) && (u = !!t.leading, d = "maxWait" in t, o = d ? DA(Ff(t.maxWait) || 0, e) : o, h = "trailing" in t ? !!t.trailing : h);
  function f(w) {
    var A = r, B = i;
    return r = i = void 0, c = w, s = n.apply(B, A), s;
  }
  function p(w) {
    return c = w, l = setTimeout(g, e), u ? f(w) : s;
  }
  function m(w) {
    var A = w - a, B = w - c, H = e - A;
    return d ? LA(H, o - B) : H;
  }
  function y(w) {
    var A = w - a, B = w - c;
    return a === void 0 || A >= e || A < 0 || d && B >= o;
  }
  function g() {
    var w = Ta();
    if (y(w))
      return C(w);
    l = setTimeout(g, m(w));
  }
  function C(w) {
    return l = void 0, h && r ? f(w) : (r = i = void 0, s);
  }
  function x() {
    l !== void 0 && clearTimeout(l), c = 0, r = a = i = l = void 0;
  }
  function L() {
    return l === void 0 ? s : C(Ta());
  }
  function D() {
    var w = Ta(), A = y(w);
    if (r = arguments, i = this, a = w, A) {
      if (l === void 0)
        return p(a);
      if (d)
        return clearTimeout(l), l = setTimeout(g, e), f(a);
    }
    return l === void 0 && (l = setTimeout(g, e)), s;
  }
  return D.cancel = x, D.flush = L, D;
}
class tb {
  constructor() {
    this.beforeMountedListeners = [], this.mountedListeners = [], this.updatedListeners = [], this.selectionUpdatedListeners = [], this.markdownUpdatedListeners = [], this.blurListeners = [], this.focusListeners = [], this.destroyListeners = [], this.beforeMount = (e) => (this.beforeMountedListeners.push(e), this), this.mounted = (e) => (this.mountedListeners.push(e), this), this.updated = (e) => (this.updatedListeners.push(e), this);
  }
  /// A getter to get all [subscribers](#interface-subscribers). You should not use this method directly.
  get listeners() {
    return {
      beforeMount: this.beforeMountedListeners,
      mounted: this.mountedListeners,
      updated: this.updatedListeners,
      markdownUpdated: this.markdownUpdatedListeners,
      blur: this.blurListeners,
      focus: this.focusListeners,
      destroy: this.destroyListeners,
      selectionUpdated: this.selectionUpdatedListeners
    };
  }
  /// Subscribe to the markdownUpdated event.
  /// This event will be triggered after the editor state is updated and **the document is changed**.
  /// The second parameter is the current markdown and the third parameter is the previous markdown.
  markdownUpdated(e) {
    return this.markdownUpdatedListeners.push(e), this;
  }
  /// Subscribe to the blur event.
  /// This event will be triggered when the editor is blurred.
  blur(e) {
    return this.blurListeners.push(e), this;
  }
  /// Subscribe to the focus event.
  /// This event will be triggered when the editor is focused.
  focus(e) {
    return this.focusListeners.push(e), this;
  }
  /// Subscribe to the destroy event.
  /// This event will be triggered before the editor is destroyed.
  destroy(e) {
    return this.destroyListeners.push(e), this;
  }
  /// Subscribe to the selectionUpdated event.
  /// This event will be triggered when the editor selection is updated.
  selectionUpdated(e) {
    return this.selectionUpdatedListeners.push(e), this;
  }
}
const Ic = X(
  new tb(),
  "listener"
), BA = new ge("MILKDOWN_LISTENER"), nb = (n) => (n.inject(Ic, new tb()), async () => {
  await n.wait(rr);
  const e = n.get(Ic), { listeners: t } = e;
  t.beforeMount.forEach((a) => a(n)), await n.wait(Gi);
  const r = n.get(ks);
  let i = null, o = null, s = null;
  const l = new xe({
    key: BA,
    view: () => ({
      destroy: () => {
        t.destroy.forEach((a) => a(n));
      }
    }),
    props: {
      handleDOMEvents: {
        focus: () => (t.focus.forEach((a) => a(n)), !1),
        blur: () => (t.blur.forEach((a) => a(n)), !1)
      }
    },
    state: {
      init: (a, c) => {
        i = c.doc, o = r(c.doc);
      },
      apply: (a) => {
        const c = a.selection;
        return (!s && c || s && !c.eq(s)) && (t.selectionUpdated.forEach((d) => {
          d(n, c, s);
        }), s = c), !a.docChanged || a.getMeta("addToHistory") === !1 ? void 0 : PA(() => {
          const { doc: d } = a;
          if (t.updated.length > 0 && i && !i.eq(d) && t.updated.forEach((h) => {
            h(n, d, i);
          }), t.markdownUpdated.length > 0 && i && !i.eq(d)) {
            const h = r(d);
            t.markdownUpdated.forEach((f) => {
              f(n, h, o);
            }), o = h;
          }
          i = d;
        }, 200)();
      }
    }
  });
  n.update(On, (a) => a.concat(l)), await n.wait(xs), t.mounted.forEach((a) => a(n));
});
nb.meta = {
  package: "@milkdown/plugin-listener",
  displayName: "Listener"
};
var Qs = 200, Se = function() {
};
Se.prototype.append = function(e) {
  return e.length ? (e = Se.from(e), !this.length && e || e.length < Qs && this.leafAppend(e) || this.length < Qs && e.leafPrepend(this) || this.appendInner(e)) : this;
};
Se.prototype.prepend = function(e) {
  return e.length ? Se.from(e).append(this) : this;
};
Se.prototype.appendInner = function(e) {
  return new $A(this, e);
};
Se.prototype.slice = function(e, t) {
  return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? Se.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
};
Se.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
Se.prototype.forEach = function(e, t, r) {
  t === void 0 && (t = 0), r === void 0 && (r = this.length), t <= r ? this.forEachInner(e, t, r, 0) : this.forEachInvertedInner(e, t, r, 0);
};
Se.prototype.map = function(e, t, r) {
  t === void 0 && (t = 0), r === void 0 && (r = this.length);
  var i = [];
  return this.forEach(function(o, s) {
    return i.push(e(o, s));
  }, t, r), i;
};
Se.from = function(e) {
  return e instanceof Se ? e : e && e.length ? new rb(e) : Se.empty;
};
var rb = /* @__PURE__ */ (function(n) {
  function e(r) {
    n.call(this), this.values = r;
  }
  n && (e.__proto__ = n), e.prototype = Object.create(n && n.prototype), e.prototype.constructor = e;
  var t = { length: { configurable: !0 }, depth: { configurable: !0 } };
  return e.prototype.flatten = function() {
    return this.values;
  }, e.prototype.sliceInner = function(i, o) {
    return i == 0 && o == this.length ? this : new e(this.values.slice(i, o));
  }, e.prototype.getInner = function(i) {
    return this.values[i];
  }, e.prototype.forEachInner = function(i, o, s, l) {
    for (var a = o; a < s; a++)
      if (i(this.values[a], l + a) === !1)
        return !1;
  }, e.prototype.forEachInvertedInner = function(i, o, s, l) {
    for (var a = o - 1; a >= s; a--)
      if (i(this.values[a], l + a) === !1)
        return !1;
  }, e.prototype.leafAppend = function(i) {
    if (this.length + i.length <= Qs)
      return new e(this.values.concat(i.flatten()));
  }, e.prototype.leafPrepend = function(i) {
    if (this.length + i.length <= Qs)
      return new e(i.flatten().concat(this.values));
  }, t.length.get = function() {
    return this.values.length;
  }, t.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, t), e;
})(Se);
Se.empty = new rb([]);
var $A = /* @__PURE__ */ (function(n) {
  function e(t, r) {
    n.call(this), this.left = t, this.right = r, this.length = t.length + r.length, this.depth = Math.max(t.depth, r.depth) + 1;
  }
  return n && (e.__proto__ = n), e.prototype = Object.create(n && n.prototype), e.prototype.constructor = e, e.prototype.flatten = function() {
    return this.left.flatten().concat(this.right.flatten());
  }, e.prototype.getInner = function(r) {
    return r < this.left.length ? this.left.get(r) : this.right.get(r - this.left.length);
  }, e.prototype.forEachInner = function(r, i, o, s) {
    var l = this.left.length;
    if (i < l && this.left.forEachInner(r, i, Math.min(o, l), s) === !1 || o > l && this.right.forEachInner(r, Math.max(i - l, 0), Math.min(this.length, o) - l, s + l) === !1)
      return !1;
  }, e.prototype.forEachInvertedInner = function(r, i, o, s) {
    var l = this.left.length;
    if (i > l && this.right.forEachInvertedInner(r, i - l, Math.max(o, l) - l, s + l) === !1 || o < l && this.left.forEachInvertedInner(r, Math.min(i, l), o, s) === !1)
      return !1;
  }, e.prototype.sliceInner = function(r, i) {
    if (r == 0 && i == this.length)
      return this;
    var o = this.left.length;
    return i <= o ? this.left.slice(r, i) : r >= o ? this.right.slice(r - o, i - o) : this.left.slice(r, o).append(this.right.slice(0, i - o));
  }, e.prototype.leafAppend = function(r) {
    var i = this.right.leafAppend(r);
    if (i)
      return new e(this.left, i);
  }, e.prototype.leafPrepend = function(r) {
    var i = this.left.leafPrepend(r);
    if (i)
      return new e(i, this.right);
  }, e.prototype.appendInner = function(r) {
    return this.left.depth >= Math.max(this.right.depth, r.depth) + 1 ? new e(this.left, new e(this.right, r)) : new e(this, r);
  }, e;
})(Se);
const zA = 500;
class vt {
  constructor(e, t) {
    this.items = e, this.eventCount = t;
  }
  // Pop the latest event off the branch's history and apply it
  // to a document transform.
  popEvent(e, t) {
    if (this.eventCount == 0)
      return null;
    let r = this.items.length;
    for (; ; r--)
      if (this.items.get(r - 1).selection) {
        --r;
        break;
      }
    let i, o;
    t && (i = this.remapping(r, this.items.length), o = i.maps.length);
    let s = e.tr, l, a, c = [], u = [];
    return this.items.forEach((d, h) => {
      if (!d.step) {
        i || (i = this.remapping(r, h + 1), o = i.maps.length), o--, u.push(d);
        return;
      }
      if (i) {
        u.push(new It(d.map));
        let f = d.step.map(i.slice(o)), p;
        f && s.maybeStep(f).doc && (p = s.mapping.maps[s.mapping.maps.length - 1], c.push(new It(p, void 0, void 0, c.length + u.length))), o--, p && i.appendMap(p, o);
      } else
        s.maybeStep(d.step);
      if (d.selection)
        return l = i ? d.selection.map(i.slice(o)) : d.selection, a = new vt(this.items.slice(0, r).append(u.reverse().concat(c)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: a, transform: s, selection: l };
  }
  // Create a new branch with the given transform added.
  addTransform(e, t, r, i) {
    let o = [], s = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
    for (let u = 0; u < e.steps.length; u++) {
      let d = e.steps[u].invert(e.docs[u]), h = new It(e.mapping.maps[u], d, t), f;
      (f = a && a.merge(h)) && (h = f, u ? o.pop() : l = l.slice(0, l.length - 1)), o.push(h), t && (s++, t = void 0), i || (a = h);
    }
    let c = s - r.depth;
    return c > _A && (l = FA(l, c), s -= c), new vt(l.append(o), s);
  }
  remapping(e, t) {
    let r = new no();
    return this.items.forEach((i, o) => {
      let s = i.mirrorOffset != null && o - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
      r.appendMap(i.map, s);
    }, e, t), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new vt(this.items.append(e.map((t) => new It(t))), this.eventCount);
  }
  // When the collab module receives remote changes, the history has
  // to know about those, so that it can adjust the steps that were
  // rebased on top of the remote changes, and include the position
  // maps for the remote changes in its array of items.
  rebased(e, t) {
    if (!this.eventCount)
      return this;
    let r = [], i = Math.max(0, this.items.length - t), o = e.mapping, s = e.steps.length, l = this.eventCount;
    this.items.forEach((h) => {
      h.selection && l--;
    }, i);
    let a = t;
    this.items.forEach((h) => {
      let f = o.getMirror(--a);
      if (f == null)
        return;
      s = Math.min(s, f);
      let p = o.maps[f];
      if (h.step) {
        let m = e.steps[f].invert(e.docs[f]), y = h.selection && h.selection.map(o.slice(a + 1, f));
        y && l++, r.push(new It(p, m, y));
      } else
        r.push(new It(p));
    }, i);
    let c = [];
    for (let h = t; h < s; h++)
      c.push(new It(o.maps[h]));
    let u = this.items.slice(0, i).append(c).append(r), d = new vt(u, l);
    return d.emptyItemCount() > zA && (d = d.compress(this.items.length - r.length)), d;
  }
  emptyItemCount() {
    let e = 0;
    return this.items.forEach((t) => {
      t.step || e++;
    }), e;
  }
  // Compressing a branch means rewriting it to push the air (map-only
  // items) out. During collaboration, these naturally accumulate
  // because each remote change adds one. The `upto` argument is used
  // to ensure that only the items below a given level are compressed,
  // because `rebased` relies on a clean, untouched set of items in
  // order to associate old items with rebased steps.
  compress(e = this.items.length) {
    let t = this.remapping(0, e), r = t.maps.length, i = [], o = 0;
    return this.items.forEach((s, l) => {
      if (l >= e)
        i.push(s), s.selection && o++;
      else if (s.step) {
        let a = s.step.map(t.slice(r)), c = a && a.getMap();
        if (r--, c && t.appendMap(c, r), a) {
          let u = s.selection && s.selection.map(t.slice(r));
          u && o++;
          let d = new It(c.invert(), a, u), h, f = i.length - 1;
          (h = i.length && i[f].merge(d)) ? i[f] = h : i.push(d);
        }
      } else s.map && r--;
    }, this.items.length, 0), new vt(Se.from(i.reverse()), o);
  }
}
vt.empty = new vt(Se.empty, 0);
function FA(n, e) {
  let t;
  return n.forEach((r, i) => {
    if (r.selection && e-- == 0)
      return t = i, !1;
  }), n.slice(t);
}
class It {
  constructor(e, t, r, i) {
    this.map = e, this.step = t, this.selection = r, this.mirrorOffset = i;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let t = e.step.merge(this.step);
      if (t)
        return new It(t.getMap().invert(), t, this.selection);
    }
  }
}
class pn {
  constructor(e, t, r, i, o) {
    this.done = e, this.undone = t, this.prevRanges = r, this.prevTime = i, this.prevComposition = o;
  }
}
const _A = 20;
function HA(n, e, t, r) {
  let i = t.getMeta(or), o;
  if (i)
    return i.historyState;
  t.getMeta(VA) && (n = new pn(n.done, n.undone, null, 0, -1));
  let s = t.getMeta("appendedTransaction");
  if (t.steps.length == 0)
    return n;
  if (s && s.getMeta(or))
    return s.getMeta(or).redo ? new pn(n.done.addTransform(t, void 0, r, Ns(e)), n.undone, _f(t.mapping.maps), n.prevTime, n.prevComposition) : new pn(n.done, n.undone.addTransform(t, void 0, r, Ns(e)), null, n.prevTime, n.prevComposition);
  if (t.getMeta("addToHistory") !== !1 && !(s && s.getMeta("addToHistory") === !1)) {
    let l = t.getMeta("composition"), a = n.prevTime == 0 || !s && n.prevComposition != l && (n.prevTime < (t.time || 0) - r.newGroupDelay || !qA(t, n.prevRanges)), c = s ? Na(n.prevRanges, t.mapping) : _f(t.mapping.maps);
    return new pn(n.done.addTransform(t, a ? e.selection.getBookmark() : void 0, r, Ns(e)), vt.empty, c, t.time, l ?? n.prevComposition);
  } else return (o = t.getMeta("rebased")) ? new pn(n.done.rebased(t, o), n.undone.rebased(t, o), Na(n.prevRanges, t.mapping), n.prevTime, n.prevComposition) : new pn(n.done.addMaps(t.mapping.maps), n.undone.addMaps(t.mapping.maps), Na(n.prevRanges, t.mapping), n.prevTime, n.prevComposition);
}
function qA(n, e) {
  if (!e)
    return !1;
  if (!n.docChanged)
    return !0;
  let t = !1;
  return n.mapping.maps[0].forEach((r, i) => {
    for (let o = 0; o < e.length; o += 2)
      r <= e[o + 1] && i >= e[o] && (t = !0);
  }), t;
}
function _f(n) {
  let e = [];
  for (let t = n.length - 1; t >= 0 && e.length == 0; t--)
    n[t].forEach((r, i, o, s) => e.push(o, s));
  return e;
}
function Na(n, e) {
  if (!n)
    return null;
  let t = [];
  for (let r = 0; r < n.length; r += 2) {
    let i = e.map(n[r], 1), o = e.map(n[r + 1], -1);
    i <= o && t.push(i, o);
  }
  return t;
}
function jA(n, e, t) {
  let r = Ns(e), i = or.get(e).spec.config, o = (t ? n.undone : n.done).popEvent(e, r);
  if (!o)
    return null;
  let s = o.selection.resolve(o.transform.doc), l = (t ? n.done : n.undone).addTransform(o.transform, e.selection.getBookmark(), i, r), a = new pn(t ? l : o.remaining, t ? o.remaining : l, null, 0, -1);
  return o.transform.setSelection(s).setMeta(or, { redo: t, historyState: a });
}
let Ia = !1, Hf = null;
function Ns(n) {
  let e = n.plugins;
  if (Hf != e) {
    Ia = !1, Hf = e;
    for (let t = 0; t < e.length; t++)
      if (e[t].spec.historyPreserveItems) {
        Ia = !0;
        break;
      }
  }
  return Ia;
}
const or = new ge("history"), VA = new ge("closeHistory");
function UA(n = {}) {
  return n = {
    depth: n.depth || 100,
    newGroupDelay: n.newGroupDelay || 500
  }, new xe({
    key: or,
    state: {
      init() {
        return new pn(vt.empty, vt.empty, null, 0, -1);
      },
      apply(e, t, r) {
        return HA(t, r, e, n);
      }
    },
    config: n,
    props: {
      handleDOMEvents: {
        beforeinput(e, t) {
          let r = t.inputType, i = r == "historyUndo" ? ob : r == "historyRedo" ? sb : null;
          return i ? (t.preventDefault(), i(e.state, e.dispatch)) : !1;
        }
      }
    }
  });
}
function ib(n, e) {
  return (t, r) => {
    let i = or.getState(t);
    if (!i || (n ? i.undone : i.done).eventCount == 0)
      return !1;
    if (r) {
      let o = jA(i, t, n);
      o && r(e ? o.scrollIntoView() : o);
    }
    return !0;
  };
}
const ob = ib(!1, !0), sb = ib(!0, !0);
function pi(n, e) {
  return Object.assign(n, {
    meta: {
      package: "@milkdown/plugin-history",
      ...e
    }
  }), n;
}
const Il = j("Undo", () => () => ob);
pi(Il, {
  displayName: "Command<undo>"
});
const Al = j("Redo", () => () => sb);
pi(Al, {
  displayName: "Command<redo>"
});
const Ol = ln({}, "historyProviderConfig");
pi(Ol, {
  displayName: "Ctx<historyProviderConfig>"
});
const lb = ot(
  (n) => UA(n.get(Ol.key))
);
pi(lb, {
  displayName: "Ctx<historyProviderPlugin>"
});
const dd = Fe("historyKeymap", {
  Undo: {
    shortcuts: "Mod-z",
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Il.key);
    }
  },
  Redo: {
    shortcuts: ["Mod-y", "Shift-Mod-z"],
    command: (n) => {
      const e = n.get(ne);
      return () => e.call(Al.key);
    }
  }
});
pi(dd.ctx, {
  displayName: "KeymapCtx<history>"
});
pi(dd.shortcuts, {
  displayName: "Keymap<history>"
});
const WA = [
  Ol,
  lb,
  dd,
  Il,
  Al
].flat();
var qf = {};
const jf = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
}, KA = {
  error: "background-color: #ff6b6b; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
  warn: "background-color: #ffa500; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
  info: "background-color: #4a90e2; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
  debug: "background-color: #50e3c2; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
  trace: "background-color: #b8e986; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;"
};
class JA {
  constructor(e) {
    T(this, "config");
    const r = new URLSearchParams(
      typeof window < "u" ? window.location.search : ""
    ).get("debug"), i = typeof process < "u" && qf ? qf : {}, o = i.DEBUG, s = i.DEBUG_LEVEL, l = i.DEBUG_MODULES, a = i.DEBUG_EXCLUDE;
    this.config = {
      enabled: r !== null || o === "true",
      level: r || s || "info",
      modules: l?.split(","),
      excludeModules: a?.split(","),
      formatTimestamp: !0,
      ...e
    };
  }
  /**
   * Update debug configuration
   */
  setConfig(e) {
    this.config = { ...this.config, ...e };
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Enable debug mode
   */
  enable(e = "info") {
    this.config.enabled = !0, this.config.level = e;
  }
  /**
   * Disable debug mode
   */
  disable() {
    this.config.enabled = !1;
  }
  /**
   * Check if a module should be logged
   */
  shouldLog(e, t) {
    return !(!this.config.enabled || jf[t] > jf[this.config.level] || this.config.modules && this.config.modules.length > 0 && !this.config.modules.some((r) => e.includes(r)) || this.config.excludeModules && this.config.excludeModules.length > 0 && this.config.excludeModules.some((r) => e.includes(r)));
  }
  /**
   * Format timestamp
   */
  formatTime() {
    if (!this.config.formatTimestamp)
      return "";
    const e = /* @__PURE__ */ new Date();
    return `${e.getHours().toString().padStart(2, "0")}:${e.getMinutes().toString().padStart(2, "0")}:${e.getSeconds().toString().padStart(2, "0")}.${e.getMilliseconds().toString().padStart(3, "0")}`;
  }
  /**
   * Core logging method
   */
  log(e, t, r, i) {
    if (!this.shouldLog(e, t))
      return;
    const o = this.formatTime(), s = t === "warn" || t === "error" ? t : "log";
    if (typeof window < "u" && window.console) {
      const l = [
        `%c[${t.toUpperCase()}]`,
        KA[t],
        o ? `[${o}]` : "",
        `[${e}]`,
        r
      ].filter((a) => a !== "");
      i !== void 0 ? console[s](...l, i) : console[s](...l);
    }
  }
  /**
   * Log error message
   */
  error(e, t, r) {
    this.log(e, "error", t, r);
  }
  /**
   * Log warning message
   */
  warn(e, t, r) {
    this.log(e, "warn", t, r);
  }
  /**
   * Log info message
   */
  info(e, t, r) {
    this.log(e, "info", t, r);
  }
  /**
   * Log debug message
   */
  debug(e, t, r) {
    this.log(e, "debug", t, r);
  }
  /**
   * Log trace message (most verbose)
   */
  trace(e, t, r) {
    this.log(e, "trace", t, r);
  }
}
const jn = new JA();
function st(n) {
  return {
    error: (e, t) => jn.error(n, e, t),
    warn: (e, t) => jn.warn(n, e, t),
    info: (e, t) => jn.info(n, e, t),
    debug: (e, t) => jn.debug(n, e, t),
    trace: (e, t) => jn.trace(n, e, t)
  };
}
function GA() {
  console.log(
    `
%c╔══════════════════════════════════════════════════════════╗
║  Quarto Review Extension - Debug Mode Help               ║
╚══════════════════════════════════════════════════════════╝%c

%cURL Parameters:%c
  ?debug=error|warn|info|debug|trace
    Set debug level (default: info)

%cEnvironment Variables:%c
  DEBUG=true                    Enable debug mode
  DEBUG_LEVEL=level             Set verbosity level
  DEBUG_MODULES=ui,changes      Only log specified modules
  DEBUG_EXCLUDE=git             Exclude modules from logging

%cProgrammatic Usage:%c
  debugLogger.enable('debug')   Enable debug mode
  debugLogger.disable()         Disable debug mode
  debugLogger.setConfig({...})  Update configuration

%cExample:%c
  ?debug=debug&module=ui        Enable debug mode for UI module only
  debugLogger.setConfig({ modules: ['changes', 'ui'] })

%cLog Levels (lowest to highest verbosity):%c
  error  - Errors only
  warn   - Errors and warnings
  info   - General information (default)
  debug  - Detailed debugging info
  trace  - Most verbose, includes tracing
`,
    "font-weight: bold; color: #4a90e2; font-size: 12px;",
    "color: inherit; font-weight: normal;",
    "font-weight: bold; color: #4a90e2;",
    "color: inherit; font-weight: normal;",
    "font-weight: bold; color: #4a90e2;",
    "color: inherit; font-weight: normal;",
    "font-weight: bold; color: #4a90e2;",
    "color: inherit; font-weight: normal;",
    "font-weight: bold; color: #4a90e2;",
    "color: inherit; font-weight: normal;",
    "font-weight: bold; color: #4a90e2;",
    "color: inherit; font-weight: normal;"
  );
}
typeof window < "u" && (window.debugLogger = jn, window.printDebugHelp = GA);
const YA = {
  addition: /\{\+\+([\s\S]+?)\+\+\}/g,
  deletion: /\{--([\s\S]+?)--\}/g,
  substitution: /\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g,
  comment: /\{>>([\s\S]+?)<<\}/g,
  highlight: /\{==([\s\S]+?)==\}(?:\{>>([\s\S]+?)<<\})?/g
};
function XA(n) {
  return Object.values(YA).some((e) => (e.lastIndex = 0, e.test(n)));
}
const Zs = (n) => ({
  type: "text",
  value: n
}), _n = (n, e) => ({
  type: "criticMarkup",
  markup: n,
  children: [Zs(e)]
});
function QA(n) {
  const e = [];
  let t = 0;
  const r = /(\{\+\+([\s\S]+?)\+\+\})|(\{--([\s\S]+?)--\})|(\{~~([\s\S]+?)~>([\s\S]+?)~~\})|(\{>>([\s\S]+?)<<\})|(\{==([\s\S]+?)==\}(?:\{>>([\s\S]+?)<<\})?)/g;
  let i;
  for (; (i = r.exec(n)) !== null; ) {
    const o = i?.[0] ?? "", s = i?.index ?? 0;
    s > t && e.push(Zs(n.substring(t, s))), i?.[1] ? e.push(_n("addition", i?.[2] ?? "")) : i?.[3] ? e.push(_n("deletion", i?.[4] ?? "")) : i?.[5] ? (e.push(_n("deletion", i?.[6] ?? "")), e.push(_n("addition", i?.[7] ?? ""))) : i?.[8] ? e.push(_n("comment", i?.[9] ?? "")) : i?.[10] && (e.push(_n("highlight", i?.[11] ?? "")), i?.[12] && e.push(_n("comment", i[12] ?? ""))), t = s + o.length;
  }
  return t < n.length && e.push(Zs(n.substring(t))), e;
}
function ri(n) {
  if (n == null || typeof n != "object") return n;
  if (Array.isArray(n))
    return n.map((t) => ri(t));
  const e = {};
  "type" in n && (e.type = n.type);
  for (const t in n)
    t === "parent" || t === "position" || n.hasOwnProperty(t) && t !== "type" && t !== "children" && (e[t] = ri(n[t]));
  return e;
}
function ab(n) {
  if (!n.children) return [];
  const e = [];
  for (const t of n.children) {
    if (t.type !== "text") {
      if ("children" in t && Array.isArray(t.children)) {
        const o = ab(t), s = ri(t);
        s.children = o, e.push(s);
      } else
        e.push(ri(t));
      continue;
    }
    const r = t;
    if (!XA(r.value)) {
      e.push(Zs(r.value));
      continue;
    }
    const i = QA(r.value);
    e.push(...i);
  }
  return e;
}
function ZA(n) {
  if (!("children" in n) || !Array.isArray(n.children))
    return ri(n);
  const t = ab(n), r = ri(n);
  return r.children = t, r;
}
function Ac(n) {
  if (n === null || typeof n != "object")
    return n;
  if (Array.isArray(n))
    return n.map(Ac);
  const e = {};
  for (const t in n)
    t === "parent" || t === "position" || n.hasOwnProperty(t) && (e[t] = Ac(n[t]));
  return e;
}
const eO = {
  addition: ["{++", "++}"],
  deletion: ["{--", "--}"],
  highlight: ["{==", "==}"],
  comment: ["{>>", "<<}"],
  substitution: ["{~~", "~~}"]
}, tO = {
  unsafe: [
    { character: "{", inConstruct: "phrasing" },
    { character: "}", inConstruct: "phrasing" }
  ],
  handlers: {
    criticMarkup: ((n, e, t, r) => {
      const { markup: i } = n, [o, s] = eO[i] ?? ["", ""], l = t.createTracker(r), a = t.enter("criticMarkup");
      let c = l.move(o);
      return c += t.containerPhrasing(n, {
        ...l.current(),
        before: c,
        after: s ? s.charAt(0) : ""
      }), c += l.move(s), a(), c;
    })
  }
}, nO = function() {
  const n = this.data();
  return (n.toMarkdownExtensions ?? (n.toMarkdownExtensions = [])).push(tO), (t) => {
    const r = ZA(t);
    return Ac(r);
  };
};
function Ho(n, e, t) {
  return {
    // Prevent invalid mark nesting in lists or other blocks
    excludes: "",
    parseDOM: [
      { tag: `span[data-critic="${e}"]` },
      ...e === "addition" ? [{ tag: "ins" }] : [],
      ...e === "deletion" ? [{ tag: "del" }] : [],
      ...e === "highlight" ? [{ tag: "mark" }] : []
    ],
    toDOM: () => e === "addition" ? ["ins", { "data-critic": e, class: t }, 0] : e === "deletion" ? ["del", { "data-critic": e, class: t }, 0] : e === "highlight" ? ["mark", { "data-critic": e, class: t }, 0] : ["span", { "data-critic": e, class: t }, 0],
    parseMarkdown: {
      match: (r) => r.type === "criticMarkup" && r.markup === e,
      runner: (r, i, o) => {
        r.openMark(o);
        const s = [];
        if (i.children && Array.isArray(i.children))
          for (const a of i.children)
            a && a.type === "text" && a.value && s.push(String(a.value));
        const l = s.map((a) => ({
          type: "text",
          value: a
        }));
        r.next(l), r.closeMark(o);
      }
    },
    toMarkdown: {
      match: (r) => r.type.name === n,
      runner: (r, i) => {
        r.withMark(i, "criticMarkup", void 0, {
          markup: e
        });
      }
    }
  };
}
const rO = ai(
  "criticAddition",
  () => Ho("criticAddition", "addition", "critic-addition")
), iO = ai(
  "criticDeletion",
  () => Ho("criticDeletion", "deletion", "critic-deletion")
), oO = ai(
  "criticHighlight",
  () => Ho("criticHighlight", "highlight", "critic-highlight")
), sO = ai(
  "criticComment",
  () => Ho("criticComment", "comment", "critic-comment")
), lO = ai(
  "criticSubstitution",
  () => Ho("criticSubstitution", "substitution", "critic-substitution")
), aO = Fe(
  "criticKeymap",
  (n) => {
    const e = n.get(nn);
    return {
      "Mod-Shift-A": Qt(e.marks.criticAddition),
      "Mod-Shift-D": Qt(e.marks.criticDeletion),
      "Mod-Shift-H": Qt(e.marks.criticHighlight),
      "Mod-Shift-C": Qt(e.marks.criticComment),
      "Mod-Shift-S": Qt(e.marks.criticSubstitution)
    };
  }
);
ot(() => new xe({
  key: new ge("criticDecoration"),
  props: {
    decorations() {
      return null;
    }
  }
}));
const cO = ot(() => new xe({
  key: new ge("criticMarkup")
})), uO = Ln(
  "criticMarkupRemark",
  () => nO
), xi = st("CommandRegistry");
class ke {
  constructor() {
    T(this, "commands", /* @__PURE__ */ new Map());
    T(this, "editor", null);
  }
  /**
   * Initialize the registry with an editor instance
   */
  setEditor(e) {
    this.editor = e;
  }
  /**
   * Register a command
   */
  register(e) {
    this.commands.has(e.id) && xi.warn(`Command '${e.id}' is already registered, overwriting`), this.commands.set(e.id, e), xi.debug(`Registered command: ${e.id}`);
  }
  /**
   * Register multiple commands at once
   */
  registerBatch(e) {
    e.forEach((t) => this.register(t));
  }
  /**
   * Execute a command by ID
   */
  execute(e) {
    if (!this.editor)
      return xi.error("Editor not initialized"), !1;
    const t = this.commands.get(e);
    if (!t)
      return xi.warn(`Command '${e}' not found`), !1;
    try {
      let r = !1;
      return this.editor.action((i) => {
        const o = {
          editor: this.editor,
          commands: i.get(ne),
          view: i.get(nt),
          state: i.get(nt).state
        };
        r = t.handler(o);
      }), r;
    } catch (r) {
      return xi.error(`Error executing command '${e}':`, r), !1;
    }
  }
  /**
   * Get command definition
   */
  getCommand(e) {
    return this.commands.get(e);
  }
  /**
   * Get all registered commands
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }
  /**
   * Check if a command is registered
   */
  hasCommand(e) {
    return this.commands.has(e);
  }
  /**
   * Get active state of a command
   */
  getActiveState(e) {
    if (!this.editor)
      return !1;
    const t = this.commands.get(e);
    if (!t || !t.isActive)
      return !1;
    let r = !1;
    return this.editor.action((i) => {
      const o = i.get(nt);
      r = t.isActive(o.state);
    }), r;
  }
  /**
   * Helper: Check if a mark is active at cursor position
   */
  static isMarkActive(e, t) {
    const { from: r, to: i } = e.selection, { marks: o } = e.schema;
    if (!o[t]) return !1;
    let l = !1;
    return e.doc.nodesBetween(r, i, (a) => a.isText && (a.marks || []).some((d) => d.type.name === t) ? (l = !0, !1) : !0), l;
  }
  /**
   * Helper: Check if a node type is active at cursor position
   */
  static isNodeActive(e, t, r) {
    const { $from: i } = e.selection;
    let o = i.depth;
    for (; o > 0; ) {
      const s = i.node(o);
      if (s.type.name === t) {
        if (!r) return !0;
        const l = s.attrs || {};
        return Object.keys(r).every(
          (a) => l[a] === r[a]
        );
      }
      o--;
    }
    return !1;
  }
  /**
   * Helper: Lift a blockquote (remove blockquote wrapper)
   */
  static liftBlockquote(e) {
    const { state: t, dispatch: r } = e, { $from: i } = t.selection;
    let o = i.depth;
    for (; o > 0 && i.node(o).type.name !== "blockquote"; )
      o--;
    if (o === 0) return !1;
    const s = i.node(o), l = i.before(o), a = l + s.nodeSize, c = t.tr, u = s.content;
    return c.replaceWith(l, a, u), r(c), !0;
  }
}
function Vf() {
  return [
    // Undo/Redo
    {
      id: "undo",
      label: "Undo",
      handler: (n) => n.commands.call(Il.key),
      isActive: () => !1
      // Undo/Redo don't have active state
    },
    {
      id: "redo",
      label: "Redo",
      handler: (n) => n.commands.call(Al.key),
      isActive: () => !1
    },
    // Inline formatting
    {
      id: "bold",
      label: "Bold",
      handler: (n) => n.commands.call(bl.key),
      isActive: (n) => ke.isMarkActive(n, "strong")
    },
    {
      id: "italic",
      label: "Italic",
      handler: (n) => n.commands.call(yl.key),
      isActive: (n) => ke.isMarkActive(n, "emphasis")
    },
    {
      id: "strike",
      label: "Strike",
      handler: (n) => n.commands.call(Tl.key),
      isActive: (n) => ke.isMarkActive(n, "strike_through")
    },
    {
      id: "code",
      label: "Code",
      handler: (n) => n.commands.call(kl.key),
      isActive: (n) => ke.isMarkActive(n, "inlineCode")
    },
    // Block formatting
    {
      id: "heading-2",
      label: "Heading 2",
      handler: (n) => ke.isNodeActive(n.state, "heading", { level: 2 }) ? n.commands.call(zr.key) : n.commands.call(At.key, 2),
      isActive: (n) => ke.isNodeActive(n, "heading", { level: 2 })
    },
    {
      id: "heading-3",
      label: "Heading 3",
      handler: (n) => ke.isNodeActive(n.state, "heading", { level: 3 }) ? n.commands.call(zr.key) : n.commands.call(At.key, 3),
      isActive: (n) => ke.isNodeActive(n, "heading", { level: 3 })
    },
    {
      id: "blockquote",
      label: "Blockquote",
      handler: (n) => ke.isNodeActive(n.state, "blockquote") ? ke.liftBlockquote(n.view) : n.commands.call(Sl.key),
      isActive: (n) => ke.isNodeActive(n, "blockquote")
    },
    {
      id: "code-block",
      label: "Code Block",
      handler: (n) => ke.isNodeActive(n.state, "code_block") ? n.commands.call(zr.key) : n.commands.call(xl.key),
      isActive: (n) => ke.isNodeActive(n, "code_block")
    },
    // Lists
    {
      id: "bullet-list",
      label: "Bullet List",
      handler: (n) => ke.isNodeActive(n.state, "bullet_list") ? n.commands.call(ho.key) : n.commands.call(vl.key),
      isActive: (n) => ke.isNodeActive(n, "bullet_list")
    },
    {
      id: "ordered-list",
      label: "Ordered List",
      handler: (n) => ke.isNodeActive(n.state, "ordered_list") ? n.commands.call(ho.key) : n.commands.call(El.key),
      isActive: (n) => ke.isNodeActive(n, "ordered_list")
    }
  ];
}
const Uf = [
  // Blocks
  [
    {
      action: "heading-2",
      label: "H2",
      title: "Heading 2 (Ctrl+Alt+2)"
    },
    {
      action: "heading-3",
      label: "H3",
      title: "Heading 3 (Ctrl+Alt+3)"
    },
    {
      action: "blockquote",
      label: ">",
      title: "Blockquote (Ctrl+Shift+B)"
    },
    {
      action: "code-block",
      label: "{}",
      title: "Code block (Ctrl+Alt+C)"
    }
  ],
  // Inline formatting
  [
    {
      action: "bold",
      label: "B",
      title: "Bold (Ctrl+B)"
    },
    {
      action: "italic",
      label: "I",
      title: "Italic (Ctrl+I)"
    },
    {
      action: "strike",
      label: "S",
      title: "Strikethrough (Ctrl+Alt+X)",
      modifierClass: "review-editor-toolbar-btn-strike"
    },
    {
      action: "code",
      label: "`",
      title: "Inline code (Ctrl+E)"
    }
  ],
  // Lists
  [
    {
      action: "bullet-list",
      label: "•",
      title: "Bullet list (Ctrl+Alt+8)"
    },
    {
      action: "ordered-list",
      label: "1.",
      title: "Ordered list (Ctrl+Alt+9)"
    }
  ]
], dO = {
  // For headers - focus on heading levels and basic formatting
  heading: [
    [
      {
        action: "heading-2",
        label: "H2",
        title: "Heading 2 (Ctrl+Alt+2)"
      },
      {
        action: "heading-3",
        label: "H3",
        title: "Heading 3 (Ctrl+Alt+3)"
      },
      {
        action: "blockquote",
        label: ">",
        title: "Blockquote (Ctrl+Shift+B)"
      }
    ],
    [
      {
        action: "bold",
        label: "B",
        title: "Bold (Ctrl+B)"
      },
      {
        action: "italic",
        label: "I",
        title: "Italic (Ctrl+I)"
      },
      {
        action: "code",
        label: "`",
        title: "Inline code (Ctrl+E)"
      }
    ]
  ],
  // For paragraphs - focus on text formatting and lists
  paragraph: [
    [
      {
        action: "bold",
        label: "B",
        title: "Bold (Ctrl+B)"
      },
      {
        action: "italic",
        label: "I",
        title: "Italic (Ctrl+I)"
      },
      {
        action: "strike",
        label: "S",
        title: "Strikethrough (Ctrl+Alt+X)",
        modifierClass: "review-editor-toolbar-btn-strike"
      },
      {
        action: "code",
        label: "`",
        title: "Inline code (Ctrl+E)"
      }
    ],
    [
      {
        action: "bullet-list",
        label: "•",
        title: "Bullet list (Ctrl+Alt+8)"
      },
      {
        action: "ordered-list",
        label: "1.",
        title: "Ordered list (Ctrl+Alt+9)"
      }
    ]
  ],
  // For code blocks - only escape option
  code_block: [
    [
      {
        action: "code-block",
        label: "{}",
        title: "Exit code block (Ctrl+Alt+C)"
      }
    ]
  ],
  // For lists - list type switching and light formatting
  bullet_list: [
    [
      {
        action: "bullet-list",
        label: "•",
        title: "Bullet list (Ctrl+Alt+8)"
      },
      {
        action: "ordered-list",
        label: "1.",
        title: "Ordered list (Ctrl+Alt+9)"
      }
    ],
    [
      {
        action: "bold",
        label: "B",
        title: "Bold (Ctrl+B)"
      },
      {
        action: "italic",
        label: "I",
        title: "Italic (Ctrl+I)"
      },
      {
        action: "code",
        label: "`",
        title: "Inline code (Ctrl+E)"
      }
    ]
  ],
  ordered_list: [
    [
      {
        action: "bullet-list",
        label: "•",
        title: "Bullet list (Ctrl+Alt+8)"
      },
      {
        action: "ordered-list",
        label: "1.",
        title: "Ordered list (Ctrl+Alt+9)"
      }
    ],
    [
      {
        action: "bold",
        label: "B",
        title: "Bold (Ctrl+B)"
      },
      {
        action: "italic",
        label: "I",
        title: "Italic (Ctrl+I)"
      },
      {
        action: "code",
        label: "`",
        title: "Inline code (Ctrl+E)"
      }
    ]
  ],
  // For blockquotes - similar to paragraphs
  blockquote: [
    [
      {
        action: "blockquote",
        label: ">",
        title: "Blockquote (Ctrl+Shift+B)"
      }
    ],
    [
      {
        action: "bold",
        label: "B",
        title: "Bold (Ctrl+B)"
      },
      {
        action: "italic",
        label: "I",
        title: "Italic (Ctrl+I)"
      },
      {
        action: "code",
        label: "`",
        title: "Inline code (Ctrl+E)"
      }
    ]
  ]
};
class cb {
  // Use context-aware button sets by default
  constructor(e) {
    T(this, "element", null);
    T(this, "handlersAttached", !1);
    T(this, "milkdownEditor", null);
    T(this, "commandRegistry");
    T(this, "isCollapsed", !0);
    // Start collapsed to show only core buttons
    T(this, "elementType", "default");
    // Current element type being edited
    T(this, "useContextMode", !0);
    this.milkdownEditor = e || null, this.commandRegistry = new ke(), e && (this.commandRegistry.setEditor(e), this.commandRegistry.registerBatch(Vf())), this.useContextMode = this.loadContextModePreference();
  }
  /**
   * Set the element type being edited (for context-aware toolbar)
   */
  setElementType(e) {
    this.elementType = e || "default";
  }
  /**
   * Get the current element type being edited
   */
  getElementType() {
    return this.elementType;
  }
  /**
   * Toggle context mode (context-aware vs. full toolbar)
   */
  toggleContextMode() {
    this.useContextMode = !this.useContextMode, this.saveContextModePreference(), this.refresh();
  }
  /**
   * Load context mode preference from localStorage
   */
  loadContextModePreference() {
    try {
      const e = localStorage.getItem("review-toolbar-context-mode");
      return e ? JSON.parse(e) : !0;
    } catch {
      return !0;
    }
  }
  /**
   * Save context mode preference to localStorage
   */
  saveContextModePreference() {
    try {
      localStorage.setItem("review-toolbar-context-mode", JSON.stringify(this.useContextMode));
    } catch {
    }
  }
  /**
   * Get button groups for current context
   */
  getButtonGroups() {
    if (!this.useContextMode)
      return Uf;
    const e = dO[this.elementType];
    return e || Uf;
  }
  /**
   * Refresh toolbar to reflect context changes
   */
  refresh() {
    if (!this.element) return;
    this.element.querySelectorAll(".review-editor-toolbar-group").forEach((o) => o.remove());
    const t = this.getButtonGroups();
    let r = 0;
    const i = 3;
    t.forEach((o, s) => {
      const l = document.createElement("div");
      l.className = "review-editor-toolbar-group", l.setAttribute("role", "group"), l.setAttribute(
        "aria-label",
        `Formatting controls group ${s + 1}`
      ), o.forEach((c) => {
        const u = document.createElement("button");
        u.type = "button", u.className = "review-editor-toolbar-btn", c.modifierClass && u.classList.add(c.modifierClass), r < i && u.classList.add("review-editor-toolbar-btn-core"), u.dataset.command = c.action, u.textContent = c.label, u.setAttribute("title", c.title), u.setAttribute("aria-label", c.title), u.setAttribute("aria-pressed", "false"), l.appendChild(u), r++;
      });
      const a = this.element.querySelector(".review-editor-toolbar-toggle");
      a ? this.element.insertBefore(l, a) : this.element.appendChild(l);
    }), this.handlersAttached && this.attachHandlers();
  }
  /**
   * Set the Milkdown editor instance
   */
  setEditor(e) {
    this.milkdownEditor = e, this.commandRegistry.setEditor(e), this.commandRegistry.getAllCommands().length === 0 && this.commandRegistry.registerBatch(Vf());
  }
  /**
   * Create the toolbar DOM element
   */
  create() {
    const e = document.createElement("div");
    e.className = "review-editor-toolbar review-editor-toolbar-collapsed", e.setAttribute("role", "toolbar"), e.setAttribute("aria-label", "Formatting toolbar");
    const t = document.createElement("button");
    t.type = "button", t.className = "review-editor-toolbar-undo-redo review-editor-toolbar-undo", t.setAttribute("aria-label", "Undo (Ctrl+Z)"), t.setAttribute("title", "Undo (Ctrl+Z)"), t.textContent = "↶", t.dataset.command = "undo", t.disabled = !0, e.appendChild(t);
    const r = document.createElement("button");
    r.type = "button", r.className = "review-editor-toolbar-undo-redo review-editor-toolbar-redo", r.setAttribute("aria-label", "Redo (Ctrl+Y)"), r.setAttribute("title", "Redo (Ctrl+Y)"), r.textContent = "↷", r.dataset.command = "redo", r.disabled = !0, e.appendChild(r);
    let i = 0;
    const o = 3;
    this.getButtonGroups().forEach((c, u) => {
      const d = document.createElement("div");
      d.className = "review-editor-toolbar-group", d.setAttribute("role", "group"), d.setAttribute(
        "aria-label",
        `Formatting controls group ${u + 1}`
      ), c.forEach((h) => {
        const f = document.createElement("button");
        f.type = "button", f.className = "review-editor-toolbar-btn", h.modifierClass && f.classList.add(h.modifierClass), i < o && f.classList.add("review-editor-toolbar-btn-core"), f.dataset.command = h.action, f.textContent = h.label, f.setAttribute("title", h.title), f.setAttribute("aria-label", h.title), f.setAttribute("aria-pressed", "false"), d.appendChild(f), i++;
      }), e.appendChild(d);
    });
    const l = document.createElement("button");
    l.type = "button", l.className = "review-editor-toolbar-context-toggle", l.setAttribute("aria-label", this.useContextMode ? "Show all buttons" : "Show smart buttons"), l.setAttribute("title", this.useContextMode ? "Show all buttons (⇄)" : "Show smart buttons (⇄)"), l.textContent = "⇄", e.appendChild(l);
    const a = document.createElement("button");
    return a.type = "button", a.className = "review-editor-toolbar-toggle", a.setAttribute("aria-label", "Expand toolbar"), a.textContent = "⋯", e.appendChild(a), this.element = e, e;
  }
  /**
   * Toggle toolbar collapsed/expanded state
   */
  toggleCollapsed() {
    if (!this.element) return;
    this.isCollapsed = !this.isCollapsed, this.element.classList.toggle("review-editor-toolbar-collapsed", this.isCollapsed);
    const e = this.element.querySelector(".review-editor-toolbar-toggle");
    e && e.setAttribute("aria-label", this.isCollapsed ? "Expand toolbar" : "Collapse toolbar");
  }
  /**
   * Attach event handlers to the toolbar
   */
  attachHandlers() {
    if (!this.element || this.handlersAttached)
      return;
    this.element.addEventListener("mousedown", (r) => {
      r.target.closest(
        "button[data-command]"
      ) && r.preventDefault();
    }), this.element.addEventListener("click", (r) => {
      const i = r.target.closest(
        "button[data-command]"
      );
      if (!i || i.disabled)
        return;
      r.preventDefault();
      const o = i.dataset.command;
      o && this.executeCommand(o);
    });
    const e = this.element.querySelector(".review-editor-toolbar-context-toggle");
    e && e.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.toggleContextMode();
    });
    const t = this.element.querySelector(".review-editor-toolbar-toggle");
    t && t.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.toggleCollapsed();
    }), this.handlersAttached = !0;
  }
  /**
   * Execute a toolbar command using the command registry
   */
  executeCommand(e) {
    if (!this.milkdownEditor) return;
    this.milkdownEditor.action((r) => {
      r.get(nt).focus();
    }), this.commandRegistry.execute(e) && requestAnimationFrame(() => {
      this.updateState();
    });
  }
  /**
   * Update button states based on current editor state
   */
  updateState() {
    if (!this.element || !this.milkdownEditor)
      return;
    Array.from(
      this.element.querySelectorAll(
        "button[data-command]"
      )
    ).forEach((t) => {
      const r = t.dataset.command;
      if (r === "undo" || r === "redo") {
        const i = this.canExecuteCommand(r);
        t.disabled = !i, t.classList.toggle("review-editor-toolbar-undo-redo-disabled", !i);
      } else {
        const i = this.commandRegistry.getActiveState(r);
        t.classList.toggle(
          "review-editor-toolbar-btn-active",
          i
        ), t.setAttribute("aria-pressed", i ? "true" : "false");
      }
    });
  }
  /**
   * Check if a command can be executed (for undo/redo state)
   */
  canExecuteCommand(e) {
    if (!this.milkdownEditor)
      return !1;
    if (e === "undo" || e === "redo") {
      let t = !1;
      return this.milkdownEditor.action((r) => {
        const i = r.get(nt).state;
        e === "undo" ? t = i.history && i.history.done && i.history.done.length > 0 : e === "redo" && (t = i.history && i.history.undone && i.history.undone.length > 0);
      }), t;
    }
    return !1;
  }
  /**
   * Get the toolbar element
   */
  getElement() {
    return this.element;
  }
  /**
   * Get command registry for external access
   */
  getCommandRegistry() {
    return this.commandRegistry;
  }
  /**
   * Destroy the toolbar and clean up
   */
  destroy() {
    this.element = null, this.handlersAttached = !1;
  }
}
const Aa = st("MilkdownEditor");
class hO extends lm {
  constructor() {
    super(...arguments);
    T(this, "instance", null);
    T(this, "toolbar", null);
    T(this, "currentContent", "");
    T(this, "contentUpdateCallback", null);
  }
  /**
   * Set callback for content updates
   */
  setContentUpdateCallback(t) {
    this.contentUpdateCallback = t;
  }
  /**
   * Get the current Milkdown instance
   */
  getInstance() {
    return this.instance;
  }
  /**
   * Get the toolbar instance
   */
  getToolbar() {
    return this.toolbar;
  }
  /**
   * Get current editor content
   */
  getContent() {
    return this.currentContent;
  }
  /**
   * Initialize Milkdown editor in a container
   * @param container - The HTML container element for the editor
   * @param content - Initial markdown content
   * @param diffHighlights - Optional diff highlights for tracked changes
   * @param elementType - The type of element being edited (header, paragraph, etc.)
   */
  async initialize(t, r, i = [], o = "default") {
    const s = t.querySelector(".review-editor-body") || t.querySelector(".review-inline-editor-body");
    if (!s)
      throw new Error("Editor container not found");
    const { mount: l, toolbarElement: a } = this.prepareLayout(s);
    try {
      const c = Zi(r);
      this.currentContent = c;
      const u = Cc.make().config((h) => {
        h.set(Es, l), h.set(ws, c), h.set(Ol.key, { depth: 100, newGroupDelay: 500 }), h.get(Ic).markdownUpdated((p, m) => {
          const y = Zi(m);
          this.currentContent = y, this.contentUpdateCallback && this.contentUpdateCallback(y), this.emit(xt.EDITOR_CONTENT_CHANGED, {
            markdown: y
          }), Aa.trace("Markdown updated:", y);
        }).selectionUpdated(() => {
          this.toolbar && this.toolbar.updateState(), this.emit(xt.EDITOR_SELECTION_CHANGED, {
            from: 0,
            to: 0
          });
        }).focus(() => {
          this.toolbar && this.toolbar.updateState(), this.emit(xt.EDITOR_FOCUSED, {});
        }).blur(() => {
          this.toolbar && this.toolbar.updateState(), this.emit(xt.EDITOR_BLURRED, {});
        });
      }).config(iN).use(zN).use(cA).use(nb).use(WA).use(uO).use(rO).use(iO).use(oO).use(sO).use(lO).use(aO).use(cO);
      i.length > 0 && u.use(this.createTrackedHighlightPlugin(i)), this.instance = await u.create(), this.toolbar = new cb(), this.toolbar.setEditor(this.instance), this.toolbar.setElementType(o);
      const d = this.toolbar.create();
      a.appendChild(d), this.toolbar.attachHandlers(), this.toolbar.updateState(), this.emit(xt.EDITOR_READY, {
        editor: this.instance
      }), Aa.debug("Milkdown editor initialized successfully");
    } catch (c) {
      Aa.error("Failed to initialize Milkdown:", c);
      const u = c instanceof Error ? c.message : String(c);
      throw s.innerHTML = `
        <div style="padding:20px; color:red;">
          Failed to initialize editor. Please try again.
          <pre>${u}</pre>
        </div>
      `, c;
    }
  }
  /**
   * Prepare editor layout with toolbar and mount point
   */
  prepareLayout(t) {
    let r = t.querySelector(
      ".review-editor-layout"
    ), i = r?.querySelector(
      ".review-editor-surface"
    ), o = r?.querySelector(
      ".review-editor-toolbar-container"
    );
    if (!r || !i || !o) {
      t.innerHTML = "", r = document.createElement("div"), r.className = "review-editor-layout";
      const s = document.createElement("div");
      s.className = "review-editor-content", i = document.createElement("div"), i.className = "review-editor-surface", s.appendChild(i), o = document.createElement("div"), o.className = "review-editor-toolbar-container", s.appendChild(o), r.appendChild(s), t.appendChild(r);
    }
    if (!i || !o)
      throw new Error("Failed to prepare editor layout");
    return { mount: i, toolbarElement: o };
  }
  /**
   * Create tracked highlight plugin for diff visualization
   */
  createTrackedHighlightPlugin(t) {
    const r = new ge("reviewTrackedHighlight");
    return ot(() => new xe({
      key: r,
      state: {
        init: (i, { doc: o }) => t.length === 0 ? se.empty : se.create(
          o,
          this.buildTrackedHighlightDecorations(o, t)
        ),
        apply(i, o) {
          return t.length === 0 || o === se.empty || !i.docChanged ? o : o.map(i.mapping, i.doc);
        }
      },
      props: {
        decorations(i) {
          return r.getState(i) ?? null;
        }
      }
    }));
  }
  /**
   * Build decorations for tracked changes
   */
  buildTrackedHighlightDecorations(t, r) {
    if (r.length === 0)
      return [];
    const i = [];
    return r.forEach((o) => {
      if (o.end <= o.start)
        return;
      const s = this.offsetToDocPosition(t, o.start), l = this.offsetToDocPosition(t, o.end);
      if (s === -1 || l === -1)
        return;
      const a = o.type === "addition" ? "review-tracked-addition" : o.type === "deletion" ? "review-tracked-deletion" : "review-tracked-modification";
      i.push(
        Ce.inline(s, l, { class: a })
      );
    }), i;
  }
  /**
   * Convert character offset to ProseMirror document position
   */
  offsetToDocPosition(t, r) {
    let i = 0, o = -1;
    return t.descendants((s, l) => {
      if (o !== -1) return !1;
      if (s.isText) {
        const a = s.text.length;
        if (i + a >= r)
          return o = l + (r - i), !1;
        i += a;
      } else s.isBlock && s !== t && (i += 2);
      return !0;
    }), o !== -1 ? o : -1;
  }
  /**
   * Destroy the editor and clean up
   */
  destroy() {
    this.instance && (this.instance.destroy(), this.instance = null), this.toolbar && (this.toolbar.destroy(), this.toolbar = null), this.currentContent = "", this.contentUpdateCallback = null, this.clearListeners();
  }
}
class fO {
  constructor(e = () => new hO()) {
    T(this, "createModule");
    T(this, "module", null);
    T(this, "editor", null);
    this.createModule = e;
  }
  /**
   * Initialize a new Milkdown editor session. Previous sessions are torn down first.
   */
  async initialize(e) {
    this.destroy();
    const t = this.createModule();
    if (this.module = t, e.onContentChange && t.on(xt.EDITOR_CONTENT_CHANGED, (r) => {
      e.onContentChange?.(r.markdown);
    }), await t.initialize(
      e.container,
      e.content,
      e.diffHighlights ?? [],
      e.elementType
    ), this.editor = t.getInstance(), !this.editor)
      throw new Error("Milkdown editor failed to provide instance after initialization");
    return this.editor;
  }
  /**
   * Get the current Milkdown Editor instance (if any).
   */
  getEditor() {
    return this.editor;
  }
  /**
   * Destroy any active Milkdown editor instance and clear references.
   */
  destroy() {
    this.module && (this.module.destroy(), this.module = null), this.editor = null;
  }
}
const ts = st("CommentsSidebar");
class pO {
  constructor() {
    T(this, "element", null);
    T(this, "isVisible", !1);
    T(this, "sections", []);
    T(this, "callbacks", null);
    this.ensureElementCreated();
  }
  create() {
    return this.ensureElementCreated(), this.element;
  }
  getElement() {
    return this.element;
  }
  show() {
    this.ensureElementCreated(), this.element && (this.element.parentNode || document.body.appendChild(this.element), this.element.classList.add("review-sidebar-open"), this.isVisible = !0, this.element.setAttribute("aria-hidden", "false"), ts.debug("Comments sidebar shown"));
  }
  hide() {
    this.element && (this.element.classList.remove("review-sidebar-open"), this.isVisible = !1, this.element.setAttribute("aria-hidden", "true"), ts.debug("Comments sidebar hidden"));
  }
  toggle() {
    this.isVisible ? this.hide() : (this.show(), this.refresh());
  }
  getIsVisible() {
    return this.isVisible;
  }
  updateSections(e, t) {
    this.sections = e, this.callbacks = t, this.refresh(), ts.debug("Comments updated", { count: e.length });
  }
  refresh() {
    if (!this.element) return;
    const e = this.element.querySelector(".review-comments-sidebar-content");
    if (e) {
      if (e.innerHTML = "", this.sections.length === 0) {
        const t = document.createElement("div");
        t.className = "review-comments-empty", t.textContent = "No comments yet", e.appendChild(t);
        return;
      }
      this.sections.forEach((t) => {
        const r = document.createElement("div");
        r.className = "review-comments-section", r.dataset.sectionId = t.element.id;
        const i = document.createElement("div");
        i.className = "review-comments-section-header", i.textContent = this.getSectionLabel(t), r.appendChild(i);
        const o = document.createElement("div");
        o.className = "review-comments-list", t.matches.forEach((s, l) => {
          const a = this.renderComment(t, s, l);
          o.appendChild(a);
        }), r.appendChild(o), e.appendChild(r);
      }), ts.debug("Comments sidebar refreshed");
    }
  }
  destroy() {
    this.element && (this.element.remove(), this.element = null), this.sections = [], this.callbacks = null, this.isVisible = !1;
  }
  ensureElementCreated() {
    if (this.element) return;
    const e = document.createElement("div");
    e.className = "review-comments-sidebar", e.setAttribute("role", "region"), e.setAttribute("aria-label", "Comments");
    const t = document.createElement("div");
    t.className = "review-comments-sidebar-header";
    const r = document.createElement("h2");
    r.textContent = "Comments", t.appendChild(r);
    const i = document.createElement("button");
    i.className = "review-comments-sidebar-close", i.setAttribute("aria-label", "Close comments"), i.textContent = "×", i.addEventListener("click", () => this.hide()), t.appendChild(i), e.appendChild(t);
    const o = document.createElement("div");
    o.className = "review-comments-sidebar-content", e.appendChild(o), this.element = e;
  }
  renderComment(e, t, r) {
    const i = e.element.id, o = `${i}:${t.start}`, s = document.createElement("div");
    s.className = "review-comment-item", s.dataset.commentKey = o, s.dataset.elementId = i, s.dataset.commentStart = String(t.start), s.setAttribute("role", "article");
    const l = document.createElement("div");
    l.className = "review-comment-item-header", l.innerHTML = `
      <span class="review-comment-position">${r + 1}/${e.matches.length}</span>
      <span class="review-comment-link" aria-hidden="true">⟶</span>
    `, s.appendChild(l);
    const a = document.createElement("div");
    a.className = "review-comment-item-body", a.innerHTML = `<div class="review-comment-text">${this.escapeHtml(
      this.extractPlainText(t.content)
    )}</div>`, s.appendChild(a);
    const c = document.createElement("div");
    return c.className = "review-comment-item-actions", c.innerHTML = `
      <button class="review-comment-action-btn" data-action="goto">View</button>
      <button class="review-comment-action-btn" data-action="remove">Remove</button>
    `, s.appendChild(c), this.callbacks && (s.querySelector('[data-action="goto"]')?.addEventListener("click", () => {
      this.callbacks?.onNavigate(i, o);
    }), s.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.callbacks?.onRemove(i, t);
    }), s.addEventListener("mouseenter", () => {
      this.callbacks?.onHover(i, o);
    }), s.addEventListener("mouseleave", () => {
      this.callbacks?.onLeave();
    }), s.addEventListener("dblclick", () => {
      this.callbacks?.onEdit(i, t);
    })), s;
  }
  getSectionLabel(e) {
    const t = this.extractPlainText(e.element.content), r = e.element.metadata.type;
    return t ? `${r}: ${t}` : r;
  }
  extractPlainText(e) {
    return e.replace(/\s+/g, " ").trim();
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}
const vi = st("CommentComposer");
class mO extends lm {
  constructor() {
    super(...arguments);
    T(this, "element", null);
    T(this, "isOpen", !1);
    T(this, "currentContext", null);
    T(this, "insertionAnchor", null);
    T(this, "originalItem", null);
    T(this, "onSubmitCallback", null);
    T(this, "onCancelCallback", null);
  }
  /**
   * Create the composer element
   */
  create() {
    const t = document.createElement("div");
    t.className = "review-comment-composer", t.setAttribute("role", "dialog"), t.setAttribute("aria-label", "Comment composer");
    const r = document.createElement("div");
    r.className = "review-comment-composer-header";
    const i = document.createElement("h3");
    i.textContent = "Add Comment", r.appendChild(i);
    const o = document.createElement("button");
    o.className = "review-comment-composer-close", o.setAttribute("aria-label", "Close composer"), o.textContent = "×", o.addEventListener("click", () => this.cancel()), r.appendChild(o), t.appendChild(r);
    const s = document.createElement("div");
    s.className = "review-comment-composer-body";
    const l = document.createElement("textarea");
    l.className = "review-comment-composer-textarea", l.placeholder = "Enter your comment...", l.setAttribute("rows", "4"), l.setAttribute("aria-label", "Comment text"), s.appendChild(l), t.appendChild(s);
    const a = document.createElement("div");
    a.className = "review-comment-composer-footer";
    const c = document.createElement("button");
    c.className = "review-comment-composer-cancel-btn", c.textContent = "Cancel", c.addEventListener("click", () => this.cancel()), a.appendChild(c);
    const u = document.createElement("button");
    return u.className = "review-comment-composer-submit-btn", u.textContent = "Post Comment", u.addEventListener("click", () => this.submit()), a.appendChild(u), t.appendChild(a), this.element = t, t;
  }
  /**
   * Get the composer element
   */
  getElement() {
    return this.element;
  }
  /**
   * Open the composer for a specific context
   * Handles DOM insertion and state management
   */
  open(t, r, i) {
    this.close(), this.element || this.create(), this.currentContext = t, i && (this.onSubmitCallback = i);
    let o = null;
    t.existingComment && (o = r.querySelector(
      `.review-comment-item[data-element-id="${t.elementId}"][data-comment-key="${t.elementId}:${t.existingComment}"]`
    )), this.insertionAnchor = o, o && (o.classList.add("review-comment-item-hidden"), this.originalItem = o);
    const s = !!t.existingComment, l = t.elementLabel || "Document section";
    this.element.innerHTML = `
      <div class="review-comment-composer-header">
        <span>${s ? "Edit comment" : "Add comment"}</span>
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="close">✕</button>
      </div>
      <p class="review-comment-composer-context">${sm(l)}</p>
      <textarea class="review-comment-composer-input" rows="4" placeholder="Enter your comment..."></textarea>
      <div class="review-comment-composer-actions">
        <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
        <button class="review-btn review-btn-primary review-btn-sm" data-action="save">${s ? "Update" : "Add"} comment</button>
      </div>
    `, this.insertionAnchor ? this.insertionAnchor.insertAdjacentElement("beforebegin", this.element) : r.prepend(this.element), r.querySelector(".review-comments-empty")?.remove(), r.scrollTop = 0, this.element.querySelector('[data-action="close"]')?.addEventListener("click", () => this.cancel()), this.element.querySelector('[data-action="cancel"]')?.addEventListener("click", () => this.cancel()), this.element.querySelector('[data-action="save"]')?.addEventListener("click", () => this.submit());
    const c = this.element.querySelector("textarea");
    c && (t.existingComment && (c.value = t.existingComment, c.select()), c.focus()), this.isOpen = !0, this.element.style.display = "block", this.element.setAttribute("aria-hidden", "false"), this.emit(xt.COMMENT_COMPOSER_OPENED, {
      elementId: t.elementId,
      existingComment: t.existingComment ? { content: t.existingComment } : void 0
    }), vi.debug("Comment composer opened", { context: t });
  }
  /**
   * Close the composer
   */
  close() {
    this.element && (this.element.style.display = "none", this.element.setAttribute("aria-hidden", "true")), this.originalItem && (this.originalItem.classList.remove("review-comment-item-hidden"), this.originalItem = null), this.insertionAnchor = null, this.isOpen = !1, this.clearForm();
  }
  /**
   * Check if composer is open
   */
  getIsOpen() {
    return this.isOpen;
  }
  /**
   * Get the current comment content
   */
  getContent() {
    if (!this.element) return "";
    const t = this.element.querySelector("textarea");
    return t ? t.value.trim() : "";
  }
  /**
   * Submit the comment
   */
  submit() {
    const t = this.getContent();
    if (!t) {
      vi.warn("Empty comment submitted");
      return;
    }
    if (!this.currentContext) {
      vi.error("No context for comment submission");
      return;
    }
    const r = !!this.currentContext.existingComment;
    this.emit(xt.COMMENT_SUBMITTED, {
      elementId: this.currentContext.elementId,
      content: t,
      isEdit: r
    }), this.onSubmitCallback && this.onSubmitCallback(t, this.currentContext), this.close(), vi.debug("Comment submitted", { context: this.currentContext, content: t });
  }
  /**
   * Cancel the composer
   */
  cancel() {
    this.currentContext && this.emit(xt.COMMENT_CANCELLED, {
      elementId: this.currentContext.elementId
    }), this.close(), this.onCancelCallback && this.onCancelCallback(), vi.debug("Comment composer cancelled");
  }
  /**
   * Clear the form
   */
  clearForm() {
    if (!this.element) return;
    const t = this.element.querySelector("textarea");
    t && (t.value = ""), this.currentContext = null;
  }
  /**
   * Register submit handler
   */
  onSubmit(t) {
    this.onSubmitCallback = t;
  }
  /**
   * Register cancel handler
   */
  onCancel(t) {
    this.onCancelCallback = t;
  }
  /**
   * Destroy the composer
   */
  destroy() {
    this.close(), this.element && this.element.remove(), this.element = null, this.currentContext = null, this.insertionAnchor = null, this.originalItem = null, this.onSubmitCallback = null, this.onCancelCallback = null, this.clearListeners();
  }
}
class gO {
  constructor() {
    T(this, "indicators", /* @__PURE__ */ new Map());
    T(this, "latestMatch", /* @__PURE__ */ new Map());
  }
  syncIndicators(e, t) {
    const r = new Set(e.map((i) => i.element.id));
    for (const [i, o] of this.indicators)
      r.has(i) || (o.remove(), this.indicators.delete(i), this.latestMatch.delete(i));
    e.forEach((i) => {
      const o = document.querySelector(
        `[data-review-id="${i.element.id}"]`
      );
      if (!o || o.classList.contains("review-editable-editing"))
        return;
      const s = this.ensureIndicator(i.element.id, o, t);
      this.updateIndicator(s, o, i);
    });
  }
  clearAll() {
    for (const e of this.indicators.values())
      e.remove();
    this.indicators.clear(), this.latestMatch.clear();
  }
  ensureIndicator(e, t, r) {
    let i = this.indicators.get(e);
    return (!i || !i.isConnected) && (i?.remove(), i = this.createIndicator(e, r), this.indicators.set(e, i)), t.contains(i) || t.appendChild(i), i;
  }
  createIndicator(e, t) {
    const r = document.createElement("button");
    r.type = "button", r.className = "review-section-comment-indicator review-badge-positioned";
    const i = document.createElement("span");
    i.className = "review-badge-icon", i.textContent = "💬", r.appendChild(i);
    const o = document.createElement("span");
    o.className = "review-badge-count is-hidden", o.textContent = "1", r.appendChild(o);
    const s = (l) => {
      l.stopPropagation(), l instanceof MouseEvent && l.preventDefault();
    };
    return r.addEventListener("mousedown", s), r.addEventListener("mouseup", s), r.addEventListener("click", (l) => {
      s(l);
      const a = r.dataset.commentKey ?? "";
      t.onShowComments(e, a);
    }), r.addEventListener("dblclick", (l) => {
      s(l);
      const a = this.latestMatch.get(e) ?? null;
      t.onOpenComposer(e, a);
    }), r.addEventListener("mouseenter", () => {
      t.onHover(e);
    }), r.addEventListener("mouseleave", () => {
      t.onLeave();
    }), r;
  }
  updateIndicator(e, t, r) {
    const { element: i, matches: o } = r, s = o[0] ?? null;
    this.latestMatch.set(i.id, s);
    const l = o.length, a = e.querySelector(".review-badge-count");
    a && (a.textContent = l > 1 ? String(l) : "1", a.classList.toggle("is-hidden", l <= 1));
    const c = s ? `${i.id}:${s.start}` : i.id;
    e.dataset.commentKey = c, e.dataset.commentStart = s ? String(s.start) : "";
    const u = (s?.comment || s?.content || "").replace(/\s+/g, " ").trim(), d = l > 1 ? `${l} comments${u ? ` • "${u}"` : ""}` : `Comment${u ? ` • "${u}"` : ""}`;
    e.setAttribute("title", d), e.setAttribute("aria-label", d), getComputedStyle(t).position === "static" && (t.style.position = "relative"), t.querySelectorAll(".review-section-comment-indicator").forEach((h) => {
      h !== e && h.parentElement?.removeChild(h);
    });
  }
  destroy() {
    this.clearAll();
  }
}
const Rr = {
  // Editor history storage
  EDITOR_HISTORY_STORAGE_PREFIX: "review-editor-history-",
  MAX_HISTORY_SIZE_BYTES: 5e5,
  // 500KB per element history
  MAX_HISTORY_STATES: 50,
  // Delay (ms) before grouping undo/redo steps
  /**
   * Animation and Transition Timings
   */
  ANIMATION_DURATION_MS: {
    FAST: 150,
    // Search debounce, editor input
    MEDIUM: 200,
    // Palette closing, search panel closing
    SLOW: 300,
    // Sidebar animation, notification removal
    FLASH_HIGHLIGHT: 1500,
    // Flash highlight on elements
    LONG_HIGHLIGHT: 2e3,
    // Flash highlight (longer variant)
    NOTIFICATION_DISPLAY: 3e3
    // How long notifications display
  },
  NOTIFICATION_DISPLAY_DURATION_MS: 3e3
};
function Fr(n) {
  return Rr.ANIMATION_DURATION_MS[n];
}
class yO {
  constructor(e) {
    T(this, "config");
    T(this, "commentState");
    T(this, "sidebar");
    T(this, "composer");
    T(this, "badges");
    T(this, "callbacks");
    T(this, "sectionCommentCache", /* @__PURE__ */ new Map());
    this.config = e.config, this.commentState = e.commentState, this.sidebar = e.sidebar, this.composer = e.composer, this.badges = e.badges, this.callbacks = e.callbacks, this.composer?.on(xt.COMMENT_SUBMITTED, (t) => {
      this.handleSubmission(t);
    }), this.composer?.on(xt.COMMENT_CANCELLED, () => {
      this.closeComposer();
    });
  }
  openComposer(e) {
    if (!this.composer || !this.sidebar) return;
    const t = this.sidebar.getElement();
    if (!t)
      return;
    const r = t.querySelector(".review-comments-sidebar-content");
    if (!r)
      return;
    this.closeComposer();
    const i = this.config.changes.getElementById(e.elementId), o = i ? this.getElementLabel(i.content, i.metadata.type) : "Document section", s = e.existingComment?.content;
    this.composer.open(
      {
        sectionId: e.elementId,
        elementId: e.elementId,
        existingComment: s,
        elementLabel: o
      },
      r
    );
    const l = r.querySelector(".review-comment-composer");
    if (l && (l.dataset.elementId = e.elementId, l.dataset.commentKey = e.commentKey ?? "", e.existingComment && (l.dataset.commentStart = String(e.existingComment.start)), this.commentState.activeCommentComposer = l, this.commentState.activeComposerInsertionAnchor = l.previousElementSibling), e.commentKey) {
      const c = r.querySelector(
        `.review-comment-item[data-comment-key="${e.commentKey}"]`
      );
      c && (c.classList.add("review-comment-item-hidden"), this.commentState.activeComposerOriginalItem = c);
    }
    r.querySelector(".review-comment-composer-input")?.focus();
  }
  closeComposer() {
    this.composer?.close(), this.commentState.activeCommentComposer && (this.commentState.activeCommentComposer.remove(), this.commentState.activeCommentComposer = null), this.commentState.activeComposerInsertionAnchor = null, this.commentState.activeComposerOriginalItem && (this.commentState.activeComposerOriginalItem.classList.remove("review-comment-item-hidden"), this.commentState.activeComposerOriginalItem = null), this.callbacks.onComposerClosed?.(), this.clearHighlight("composer");
  }
  handleSubmission(e) {
    const { elementId: t, content: r, isEdit: i, start: o } = e ?? {};
    !t || typeof r != "string" || (i && typeof o == "number" ? this.updateSectionComment(t, o, r) : this.addSectionComment(t, r), this.closeComposer());
  }
  removeComment(e, t) {
    try {
      const r = this.config.changes.getElementContent(e), i = this.config.comments.accept(r, t);
      this.config.changes.edit(e, i);
      const o = this.extractSectionComments(i);
      this.cacheSectionCommentMarkup(e, o.commentMarkup), this.callbacks.requestRefresh(), this.callbacks.ensureSidebarVisible?.(), this.callbacks.showNotification("Comment removed", "success");
    } catch (r) {
      console.error("Failed to remove comment:", r), this.callbacks.showNotification("Failed to remove comment", "error");
    }
  }
  addSectionComment(e, t) {
    try {
      const r = this.config.changes.getElementContent(e), i = this.config.comments.parse(r).filter((c) => c.type === "comment"), o = i.length - 1, s = o >= 0 ? i[o] : void 0, l = s ? r.substring(0, s.start) + this.config.comments.createComment(t) + r.substring(s.end) : r + this.config.comments.createComment(t);
      this.config.changes.edit(e, l);
      const a = this.extractSectionComments(l);
      this.cacheSectionCommentMarkup(e, a.commentMarkup), this.callbacks.requestRefresh(), this.callbacks.ensureSidebarVisible?.(), window.getSelection()?.removeAllRanges(), this.callbacks.showNotification("Comment added successfully", "success");
    } catch (r) {
      console.error("Failed to add section comment:", r), this.callbacks.showNotification("Failed to add comment", "error");
    }
  }
  updateSectionComment(e, t, r) {
    try {
      const i = this.config.changes.getElementContent(e), s = this.config.comments.parse(i).filter((c) => c.type === "comment").find((c) => c.start === t);
      if (!s) {
        this.addSectionComment(e, r);
        return;
      }
      const l = i.substring(0, s.start) + this.config.comments.createComment(r) + i.substring(s.end);
      this.config.changes.edit(e, l);
      const a = this.extractSectionComments(l);
      this.cacheSectionCommentMarkup(e, a.commentMarkup), this.callbacks.requestRefresh(), this.callbacks.ensureSidebarVisible?.(), this.callbacks.showNotification("Comment updated", "success");
    } catch (i) {
      console.error("Failed to update comment:", i), this.callbacks.showNotification("Failed to update comment", "error");
    }
  }
  getElementLabel(e, t) {
    const r = this.config.markdown.toPlainText(e).replace(/\s+/g, " ").trim();
    return r ? `${t}: ${r}` : t;
  }
  getSectionComments() {
    const e = this.config.changes.getCurrentState?.() ?? [];
    if (!Array.isArray(e))
      return [];
    const t = typeof this.config.comments.parse == "function" ? this.config.comments.parse.bind(this.config.comments) : () => [], r = [];
    return e.forEach((i) => {
      const o = t(i.content).filter((s) => s.type === "comment");
      o.length > 0 && r.push({ element: i, matches: o });
    }), r;
  }
  getCommentCounts() {
    const e = /* @__PURE__ */ new Map();
    return this.getSectionComments().forEach(({ element: t, matches: r }) => {
      e.set(t.id, r.length);
    }), e;
  }
  refreshUI(e) {
    const t = this.getSectionComments();
    e.showSidebar && this.sidebar?.show(), this.sidebar?.updateSections(t, {
      onNavigate: (r, i) => {
        this.focusCommentAnchor(r, i);
      },
      onRemove: (r, i) => {
        this.removeComment(r, i), this.clearHighlight();
      },
      onEdit: (r, i) => {
        this.openComposer({
          elementId: r,
          existingComment: i,
          commentKey: i ? `${r}:${i.start}` : void 0
        });
      },
      onHover: (r, i) => {
        this.highlightSection(r, "hover", i);
      },
      onLeave: () => {
        this.clearHighlight("hover");
      }
    }), this.badges?.syncIndicators(t, {
      onShowComments: (r, i) => {
        this.sidebar?.show(), i ? this.focusCommentAnchor(r, i) : this.highlightSection(r, "hover");
      },
      onOpenComposer: (r, i) => {
        this.openComposer({
          elementId: r,
          existingComment: i ?? void 0,
          commentKey: i ? `${r}:${i.start}` : void 0
        });
      },
      onHover: (r) => {
        this.highlightSection(r, "hover");
      },
      onLeave: () => {
        this.clearHighlight("hover");
      }
    });
  }
  cacheSectionCommentMarkup(e, t) {
    t && t.trim() ? this.sectionCommentCache.set(e, t) : this.sectionCommentCache.delete(e);
  }
  consumeSectionCommentMarkup(e) {
    const t = this.sectionCommentCache.get(e);
    return t !== void 0 && this.sectionCommentCache.delete(e), t;
  }
  clearSectionCommentMarkup(e) {
    this.sectionCommentCache.delete(e);
  }
  clearSectionCommentMarkupFor(e) {
    e.forEach((t) => this.sectionCommentCache.delete(t));
  }
  extractSectionComments(e) {
    let t = e;
    const r = [], i = /\s*\{>>[\s\S]*?<<\}\s*$/;
    for (; ; ) {
      const o = t.match(i);
      if (!o || o.index === void 0)
        break;
      r.unshift(o[0]), t = t.slice(0, o.index);
    }
    return {
      content: t.replace(/\s+$/u, ""),
      commentMarkup: r.length > 0 ? r.join("") : null
    };
  }
  appendSectionComments(e, t) {
    return `${e.replace(/\s+$/u, "")}${t}`;
  }
  highlightSection(e, t, r) {
    const i = document.querySelector(
      `[data-review-id="${e}"]`
    );
    if (i) {
      if (this.commentState.activeHighlightedSection && this.commentState.activeHighlightedSection !== i && this.commentState.activeHighlightedSection.classList.remove("review-comment-section-highlight"), this.commentState.activeHighlightedSection = i, this.commentState.highlightedBy = t, i.classList.add("review-comment-section-highlight"), this.updateCommentHighlights(e, r, t), this.commentState.activeCommentComposer) {
        const o = this.commentState.activeCommentComposer.dataset.elementId === e;
        t === "composer" && o ? this.commentState.activeCommentComposer.classList.add("review-comment-composer-active") : t === "hover" && this.commentState.activeCommentComposer.classList.remove("review-comment-composer-active");
      }
      this.sanitizeInlineCommentArtifacts(i);
    }
  }
  clearHighlight(e) {
    if (!(e && this.commentState.highlightedBy && this.commentState.highlightedBy !== e) && (this.commentState.activeHighlightedSection && this.commentState.activeHighlightedSection.classList.remove("review-comment-section-highlight"), this.commentState.activeHighlightedSection = null, this.commentState.highlightedBy = null, this.updateCommentHighlights(null, void 0, e ?? "hover"), e !== "hover" && this.commentState.activeCommentComposer && e === "composer" && this.commentState.activeCommentComposer.classList.remove("review-comment-composer-active"), e === "hover" && this.commentState.activeCommentComposer)) {
      const t = this.commentState.activeCommentComposer.dataset.elementId, r = this.commentState.activeCommentComposer.dataset.commentStart;
      t && this.highlightSection(
        t,
        "composer",
        r ? `${t}:${r}` : void 0
      );
    }
  }
  focusCommentAnchor(e, t) {
    const r = document.querySelector(
      `[data-review-id="${e}"]`
    );
    if (!r)
      return;
    const i = r.querySelector(
      `[data-comment-anchor="${t}"]`
    );
    i ? (i.scrollIntoView({ behavior: "smooth", block: "center" }), i.classList.add("review-comment-anchor-highlight"), setTimeout(() => {
      i.classList.remove("review-comment-anchor-highlight");
    }, Fr("LONG_HIGHLIGHT")), i.focus({ preventScroll: !0 })) : (r.scrollIntoView({ behavior: "smooth", block: "center" }), r.classList.add("review-highlight-flash"), setTimeout(() => {
      r.classList.remove("review-highlight-flash");
    }, Fr("LONG_HIGHLIGHT")));
  }
  updateCommentHighlights(e, t, r) {
    if (document.querySelectorAll(".review-comment-item").forEach((o) => o.classList.remove("review-comment-item-highlight")), !e)
      return;
    const i = document.querySelectorAll(
      `.review-comment-item[data-element-id="${e}"]`
    );
    t ? i.forEach((o) => {
      o.dataset.commentKey === t && o.classList.add("review-comment-item-highlight");
    }) : r === "hover" && i.forEach((o) => o.classList.add("review-comment-item-highlight"));
  }
  syncBadges(e, t) {
    this.badges?.syncIndicators(e, t);
  }
  clearBadges() {
    this.badges?.clearAll();
  }
  sanitizeInlineCommentArtifacts(e) {
    e.querySelectorAll('[data-critic-type="comment"]').forEach((t) => {
      t.style.display = "none", t.setAttribute("aria-hidden", "true");
    }), e.querySelectorAll('[data-critic-type="highlight"]').forEach((t) => {
      t.classList.remove("review-comment-anchor"), t.removeAttribute("data-comment-anchor"), t.removeAttribute("tabindex"), t.removeAttribute("role"), t.style.backgroundColor = "";
    });
  }
}
const Oa = st("MainSidebar");
class bO {
  constructor() {
    T(this, "element", null);
    T(this, "undoBtn", null);
    T(this, "redoBtn", null);
    T(this, "trackedChangesToggle", null);
    T(this, "commentsBtn", null);
    T(this, "toggleBtn", null);
    T(this, "unsavedIndicator", null);
    T(this, "onUndoCallback", null);
    T(this, "onRedoCallback", null);
    T(this, "onTrackedChangesCallback", null);
    T(this, "onShowCommentsCallback", null);
    T(this, "onToggleSidebarCallback", null);
  }
  /**
   * Lazily create (or return) the sidebar element.
   */
  create() {
    if (this.element)
      return this.element;
    const e = document.createElement("div");
    e.className = "review-toolbar review-persistent-sidebar", e.setAttribute("role", "toolbar"), e.setAttribute("aria-label", "Review tools");
    const t = document.createElement("div");
    t.className = "review-sidebar-header";
    const r = document.createElement("h3");
    r.textContent = "Review Tools", t.appendChild(r), this.toggleBtn = document.createElement("button"), this.toggleBtn.className = "review-btn review-btn-icon", this.toggleBtn.setAttribute("data-action", "toggle-sidebar"), this.toggleBtn.setAttribute("title", "Collapse sidebar"), this.toggleBtn.setAttribute("aria-label", "Collapse sidebar"), this.toggleBtn.setAttribute("aria-expanded", "true");
    const i = document.createElement("span");
    i.className = "review-icon-chevron", i.textContent = "‹", this.toggleBtn.appendChild(i), this.toggleBtn.addEventListener("click", () => {
      this.onToggleSidebarCallback?.();
    }), t.appendChild(this.toggleBtn), e.appendChild(t);
    const o = document.createElement("div");
    o.className = "review-sidebar-body";
    const s = document.createElement("div");
    s.className = "review-sidebar-section";
    const l = document.createElement("h4");
    l.textContent = "Actions", s.appendChild(l), this.undoBtn = document.createElement("button"), this.undoBtn.className = "review-btn review-btn-secondary review-btn-block", this.undoBtn.setAttribute("data-action", "undo"), this.undoBtn.setAttribute("title", "Undo (Ctrl+Z)"), this.undoBtn.setAttribute("aria-label", "Undo (Ctrl+Z)"), this.undoBtn.textContent = "↶ Undo", this.undoBtn.disabled = !0, this.undoBtn.addEventListener("click", () => {
      this.onUndoCallback?.();
    }), s.appendChild(this.undoBtn), this.redoBtn = document.createElement("button"), this.redoBtn.className = "review-btn review-btn-secondary review-btn-block", this.redoBtn.setAttribute("data-action", "redo"), this.redoBtn.setAttribute("title", "Redo (Ctrl+Y)"), this.redoBtn.setAttribute("aria-label", "Redo (Ctrl+Y)"), this.redoBtn.textContent = "↷ Redo", this.redoBtn.disabled = !0, this.redoBtn.addEventListener("click", () => {
      this.onRedoCallback?.();
    }), s.appendChild(this.redoBtn), o.appendChild(s);
    const a = document.createElement("div");
    a.className = "review-sidebar-section";
    const c = document.createElement("h4");
    c.textContent = "View", a.appendChild(c);
    const u = document.createElement("label");
    u.className = "review-checkbox-label", this.trackedChangesToggle = document.createElement("input"), this.trackedChangesToggle.type = "checkbox", this.trackedChangesToggle.setAttribute("data-action", "toggle-tracked-changes"), this.trackedChangesToggle.setAttribute("aria-label", "Show tracked changes"), this.trackedChangesToggle.className = "review-sidebar-checkbox", this.trackedChangesToggle.addEventListener("change", (m) => {
      const y = m.target;
      this.onTrackedChangesCallback?.(y.checked);
    }), u.appendChild(this.trackedChangesToggle);
    const d = document.createElement("span");
    d.className = "review-sidebar-label-text", d.textContent = "Show tracked changes", u.appendChild(d), a.appendChild(u), o.appendChild(a);
    const h = document.createElement("div");
    h.className = "review-sidebar-section";
    const f = document.createElement("h4");
    f.textContent = "Comments", h.appendChild(f), this.commentsBtn = document.createElement("button"), this.commentsBtn.className = "review-btn review-btn-primary review-btn-block", this.commentsBtn.setAttribute("data-action", "show-comments"), this.commentsBtn.textContent = "💬 View Comments", this.commentsBtn.addEventListener("click", () => {
      this.onShowCommentsCallback?.();
    }), h.appendChild(this.commentsBtn), o.appendChild(h);
    const p = document.createElement("div");
    return p.className = "review-sidebar-section review-sidebar-help", p.innerHTML = `
      <h4>Help</h4>
      <p class="review-help-text">
        <strong>Click</strong> a section for quick actions<br>
        <strong>Double-click</strong> to edit text<br>
        <strong>💬 badge</strong> to review comments
      </p>
    `, o.appendChild(p), e.appendChild(o), this.element = e, Oa.debug("Main sidebar created"), e;
  }
  getElement() {
    return this.element;
  }
  updateUndoRedoState(e, t) {
    this.undoBtn && (this.undoBtn.disabled = !e, this.undoBtn.classList.toggle("review-btn-disabled", !e)), this.redoBtn && (this.redoBtn.disabled = !t, this.redoBtn.classList.toggle("review-btn-disabled", !t)), Oa.debug("Undo/redo state updated", { canUndo: e, canRedo: t });
  }
  setTrackedChangesVisible(e) {
    this.trackedChangesToggle && (this.trackedChangesToggle.checked = e, this.trackedChangesToggle.closest(".review-checkbox-label")?.classList.toggle("review-checkbox-active", e)), Oa.debug("Tracked changes visibility set", { visible: e });
  }
  getTrackedChangesEnabled() {
    return this.trackedChangesToggle?.checked ?? !1;
  }
  onUndo(e) {
    this.onUndoCallback = e;
  }
  onRedo(e) {
    this.onRedoCallback = e;
  }
  onTrackedChangesToggle(e) {
    this.onTrackedChangesCallback = e;
  }
  onShowComments(e) {
    this.onShowCommentsCallback = e;
  }
  onToggleSidebar(e) {
    this.onToggleSidebarCallback = e;
  }
  /**
   * Update the toggle button to reflect the collapsed state managed by UIModule.
   */
  setCollapsed(e) {
    if (!this.toggleBtn) return;
    const t = this.toggleBtn.querySelector(".review-icon-chevron");
    t && (t.textContent = e ? "›" : "‹"), this.toggleBtn.setAttribute("title", e ? "Expand sidebar" : "Collapse sidebar"), this.toggleBtn.setAttribute("aria-label", e ? "Expand sidebar" : "Collapse sidebar"), this.toggleBtn.setAttribute("aria-expanded", e ? "false" : "true");
  }
  setHasUnsavedChanges(e) {
    if (this.element)
      if (e) {
        if (!this.unsavedIndicator) {
          const t = document.createElement("div");
          t.className = "review-unsaved-indicator", t.setAttribute("title", "Unsaved changes"), this.element.appendChild(t), this.unsavedIndicator = t;
        }
      } else
        this.unsavedIndicator?.remove(), this.unsavedIndicator = null;
  }
  destroy() {
    this.element?.remove(), this.element = null, this.undoBtn = null, this.redoBtn = null, this.trackedChangesToggle = null, this.commentsBtn = null, this.toggleBtn = null, this.unsavedIndicator = null, this.onUndoCallback = null, this.onRedoCallback = null, this.onTrackedChangesCallback = null, this.onShowCommentsCallback = null, this.onToggleSidebarCallback = null;
  }
}
const Wf = st("ContextMenu");
class kO {
  constructor() {
    T(this, "element", null);
    T(this, "isOpen", !1);
    T(this, "currentSectionId", null);
    T(this, "onEditCallback", null);
    T(this, "onCommentCallback", null);
    T(this, "clickListener", null);
    T(this, "keydownListener", null);
  }
  /**
   * Create the context menu element
   */
  create() {
    const e = document.createElement("div");
    e.className = "review-context-menu", e.setAttribute("role", "menu"), e.style.display = "none";
    const t = document.createElement("button");
    t.className = "review-context-menu-item review-context-menu-edit", t.setAttribute("role", "menuitem"), t.textContent = "Edit", t.addEventListener("click", () => {
      this.currentSectionId && this.onEditCallback && this.onEditCallback(this.currentSectionId), this.close();
    }), e.appendChild(t);
    const r = document.createElement("button");
    return r.className = "review-context-menu-item review-context-menu-comment", r.setAttribute("role", "menuitem"), r.textContent = "Add Comment", r.addEventListener("click", () => {
      this.currentSectionId && this.onCommentCallback && this.onCommentCallback(this.currentSectionId), this.close();
    }), e.appendChild(r), this.clickListener = () => {
      this.isOpen && this.close();
    }, document.addEventListener("click", this.clickListener), this.keydownListener = (i) => {
      i.key === "Escape" && this.isOpen && this.close();
    }, document.addEventListener("keydown", this.keydownListener), this.element = e, document.body.appendChild(e), e;
  }
  /**
   * Get the context menu element
   */
  getElement() {
    return this.element;
  }
  /**
   * Open the context menu at a position
   */
  open(e, t) {
    this.element || this.create(), this.currentSectionId = e, this.element.style.left = `${t.x}px`, this.element.style.top = `${t.y}px`, this.element.style.display = "block", this.isOpen = !0;
    const r = this.element.querySelector("button");
    r && r.focus(), Wf.debug("Context menu opened", { sectionId: e, position: t });
  }
  /**
   * Close the context menu
   */
  close() {
    this.element && (this.element.style.display = "none", this.isOpen = !1, this.currentSectionId = null, Wf.debug("Context menu closed"));
  }
  /**
   * Check if menu is open
   */
  getIsOpen() {
    return this.isOpen;
  }
  /**
   * Register edit handler
   */
  onEdit(e) {
    this.onEditCallback = e;
  }
  /**
   * Register comment handler
   */
  onComment(e) {
    this.onCommentCallback = e;
  }
  /**
   * Destroy the context menu
   */
  destroy() {
    this.element && this.element.remove(), this.clickListener && (document.removeEventListener("click", this.clickListener), this.clickListener = null), this.keydownListener && (document.removeEventListener("keydown", this.keydownListener), this.keydownListener = null), this.element = null, this.onEditCallback = null, this.onCommentCallback = null;
  }
}
class wO {
  constructor(e) {
    T(this, "menu");
    this.menu = new kO(), this.menu.onEdit(e.onEdit), this.menu.onComment(e.onComment);
  }
  openFromEvent(e, t) {
    const r = e.getAttribute("data-review-id");
    if (!r)
      return;
    const i = {
      x: t.clientX,
      y: t.clientY
    };
    this.menu.open(r, i);
  }
  close() {
    this.menu.close();
  }
  destroy() {
    this.menu.destroy();
  }
}
function CO(n, e, t, r) {
  if (!e || n.length === 0)
    return;
  const i = n.length - 1, o = n[i];
  o && (n[i] = {
    ...o,
    content: r(o.content, e),
    metadata: o.metadata ?? t
  });
}
function Kf(n) {
  return Zi(n.replace(/\r\n/g, `
`)).replace(/[ \t]+$/gm, "").trim();
}
class SO {
  constructor(e) {
    T(this, "logger", st("EditorHistoryStorage"));
    this.options = e;
  }
  save(e, t) {
    if (!e) return;
    const r = this.get(e);
    r.states.push({ content: t, timestamp: Date.now() }), r.states.length > this.options.maxStates && r.states.shift(), r.lastUpdated = Date.now(), this.persist(e, r);
  }
  get(e) {
    try {
      const t = localStorage.getItem(this.storageKey(e));
      if (t) {
        const r = JSON.parse(t);
        return {
          elementId: e,
          states: r.states ?? [],
          lastUpdated: r.lastUpdated ?? Date.now()
        };
      }
    } catch (t) {
      this.logger.warn("Failed to retrieve editor history:", t);
    }
    return {
      elementId: e,
      states: [],
      lastUpdated: Date.now()
    };
  }
  list() {
    const e = [];
    try {
      for (let t = 0; t < localStorage.length; t++) {
        const r = localStorage.key(t);
        if (!r || !r.startsWith(this.options.prefix))
          continue;
        const i = localStorage.getItem(r);
        if (i)
          try {
            const o = JSON.parse(i);
            e.push({
              elementId: o.elementId,
              stateCount: o.states?.length ?? 0,
              lastUpdated: o.lastUpdated ? new Date(o.lastUpdated).toLocaleString() : "Unknown",
              size: i.length
            });
          } catch (o) {
            this.logger.warn("Failed to parse stored history", {
              key: r,
              error: o
            });
          }
      }
    } catch (t) {
      this.logger.warn("Failed to enumerate editor histories:", t);
    }
    return e;
  }
  clear(e) {
    try {
      localStorage.removeItem(this.storageKey(e)), this.logger.debug("Editor history cleared", { elementId: e });
    } catch (t) {
      this.logger.warn("Failed to clear editor history:", t);
    }
  }
  clearAll() {
    try {
      const e = [];
      for (let t = 0; t < localStorage.length; t++) {
        const r = localStorage.key(t);
        r?.startsWith(this.options.prefix) && e.push(r);
      }
      e.forEach((t) => localStorage.removeItem(t)), this.logger.debug("Cleared editor histories", {
        count: e.length
      });
    } catch (e) {
      this.logger.warn("Failed to clear editor histories:", e);
    }
  }
  persist(e, t) {
    try {
      this.store(e, t);
    } catch (r) {
      r instanceof Error && r.name === "QuotaExceededError" ? (this.logger.warn("localStorage quota exceeded, pruning histories", {
        elementId: e
      }), this.pruneOldHistories(), this.store(e, t)) : this.logger.warn("Failed to save editor history:", r);
    }
  }
  store(e, t) {
    let r = JSON.stringify(t);
    r.length > this.options.maxSize && (t.states = t.states.slice(
      Math.floor(t.states.length / 2)
    ), r = JSON.stringify(t)), localStorage.setItem(this.storageKey(e), r), this.logger.debug("Editor history saved", {
      elementId: e,
      stateCount: t.states.length
    });
  }
  pruneOldHistories() {
    try {
      const e = [];
      for (let r = 0; r < localStorage.length; r++) {
        const i = localStorage.key(r);
        if (!i || !i.startsWith(this.options.prefix)) continue;
        const o = localStorage.getItem(i);
        if (o)
          try {
            const s = JSON.parse(o);
            e.push({
              key: i,
              timestamp: s.lastUpdated || 0
            });
          } catch {
            e.push({ key: i, timestamp: 0 });
          }
      }
      e.sort((r, i) => r.timestamp - i.timestamp);
      const t = Math.ceil(e.length / 2);
      for (let r = 0; r < t; r++) {
        const i = e[r];
        i && localStorage.removeItem(i.key);
      }
      this.logger.debug("Pruned editor histories", {
        removed: t,
        remaining: e.length - t
      });
    } catch (e) {
      this.logger.warn("Failed to prune editor histories:", e);
    }
  }
  storageKey(e) {
    return `${this.options.prefix}${e}`;
  }
}
const xO = st("ChangeSummary");
class vO {
  constructor(e) {
    T(this, "config");
    T(this, "summaryElement", null);
    T(this, "summary", null);
    this.config = e;
  }
  /**
   * Calculate comprehensive change summary from operations
   */
  calculateSummary() {
    const e = this.config.changes.getOperations(), t = this.config.changes.getCurrentState(), r = {
      totalChanges: e.filter((o) => o.type === "edit").length,
      additions: 0,
      deletions: 0,
      substitutions: 0,
      changesByElementType: /* @__PURE__ */ new Map(),
      charactersAdded: 0,
      charactersRemoved: 0,
      elementsModified: 0,
      comments: 0
    }, i = /* @__PURE__ */ new Set();
    return e.forEach((o) => {
      if (o.type !== "edit") return;
      i.add(o.elementId);
      const s = this.config.changes.getElementContentWithTrackedChanges(o.elementId), l = s.match(/\{\+\+([\s\S]*?)\+\+\}/g) || [], a = s.match(/\{\-\-([\s\S]*?)\-\-\}/g) || [], c = s.match(/\{\~\~([\s\S]*?)\~>([\s\S]*?)\~\~\}/g) || [];
      r.additions += l.length, r.deletions += a.length, r.substitutions += c.length, l.forEach((d) => {
        const h = d.replace(/\{\+\+|\+\+\}/g, "");
        r.charactersAdded += h.length;
      }), a.forEach((d) => {
        const h = d.replace(/\{\-\-|\-\-\}/g, "");
        r.charactersRemoved += h.length;
      });
      const u = this.config.changes.getElementById(o.elementId);
      if (u) {
        const d = u.metadata.type;
        r.changesByElementType.set(
          d,
          (r.changesByElementType.get(d) || 0) + 1
        );
      }
    }), r.elementsModified = i.size, t.forEach((o) => {
      const s = this.config.comments.parse(o.content);
      r.comments += s.length;
    }), this.summary = r, r;
  }
  /**
   * Get list of all changes with their locations
   */
  getChangesList() {
    const e = this.config.changes.getOperations(), t = [];
    let r = 0;
    return e.forEach((i) => {
      if (i.type !== "edit") return;
      const o = this.config.changes.getElementById(i.elementId);
      if (!o) return;
      const l = (this.config.markdown.toPlainText(o.content) || "").substring(0, 100).replace(/\s+/g, " ").trim();
      let a = "substitution";
      const c = this.config.changes.getElementContentWithTrackedChanges(i.elementId);
      c.includes("{++") && !c.includes("{--") ? a = "addition" : c.includes("{--") && !c.includes("{++") && (a = "deletion"), t.push({
        elementId: i.elementId,
        elementType: o.metadata.type,
        position: r++,
        preview: l,
        type: a
      });
    }), t;
  }
  /**
   * Render the change summary dashboard
   */
  renderDashboard() {
    try {
      const e = this.calculateSummary(), t = document.createElement("div");
      t.className = "review-change-summary-dashboard", t.setAttribute("role", "region"), t.setAttribute("aria-label", "Change summary statistics");
      const r = e.totalChanges > 0 ? Math.round(e.additions / e.totalChanges * 100) : 0, i = e.totalChanges > 0 ? Math.round(e.deletions / e.totalChanges * 100) : 0, o = e.totalChanges > 0 ? Math.round(e.substitutions / e.totalChanges * 100) : 0;
      return t.innerHTML = `
      <div class="review-summary-section">
        <div class="review-summary-header">
          <h3>📊 Change Summary</h3>
          <span class="review-summary-refresh" data-action="refresh" title="Recalculate">🔄</span>
        </div>

        <div class="review-summary-stats">
          <div class="review-stat-card review-stat-primary">
            <div class="review-stat-value">${e.totalChanges}</div>
            <div class="review-stat-label">Total Changes</div>
          </div>

          <div class="review-stat-card review-stat-modified">
            <div class="review-stat-value">${e.elementsModified}</div>
            <div class="review-stat-label">Elements Modified</div>
          </div>

          <div class="review-stat-card review-stat-comments">
            <div class="review-stat-value">${e.comments}</div>
            <div class="review-stat-label">Comments</div>
          </div>
        </div>

        <div class="review-summary-breakdown">
          <h4>Change Types</h4>

          <div class="review-change-type">
            <div class="review-change-type-header">
              <span class="review-change-icon review-change-add">➕</span>
              <span class="review-change-label">Additions</span>
              <span class="review-change-count">${e.additions}</span>
            </div>
            <div class="review-change-bar">
              <div
                class="review-change-bar-fill review-change-bar-add"
                style="width: ${r}%"
              ></div>
            </div>
            <div class="review-change-chars">${e.charactersAdded} characters added</div>
          </div>

          <div class="review-change-type">
            <div class="review-change-type-header">
              <span class="review-change-icon review-change-remove">➖</span>
              <span class="review-change-label">Deletions</span>
              <span class="review-change-count">${e.deletions}</span>
            </div>
            <div class="review-change-bar">
              <div
                class="review-change-bar-fill review-change-bar-remove"
                style="width: ${i}%"
              ></div>
            </div>
            <div class="review-change-chars">${e.charactersRemoved} characters removed</div>
          </div>

          <div class="review-change-type">
            <div class="review-change-type-header">
              <span class="review-change-icon review-change-sub">🔄</span>
              <span class="review-change-label">Substitutions</span>
              <span class="review-change-count">${e.substitutions}</span>
            </div>
            <div class="review-change-bar">
              <div
                class="review-change-bar-fill review-change-bar-sub"
                style="width: ${o}%"
              ></div>
            </div>
          </div>
        </div>

        <div class="review-summary-by-type">
          <h4>Changes by Element Type</h4>
          <div class="review-element-types">
            ${Array.from(e.changesByElementType.entries()).map(([s, l]) => `
                <div class="review-element-type-item">
                  <span class="review-element-type-name">${this.getElementTypeIcon(s)} ${s}</span>
                  <span class="review-element-type-count">${l}</span>
                </div>
              `).join("")}
          </div>
        </div>

        <div class="review-summary-actions" role="group" aria-label="Change summary actions">
          <button
            class="review-btn review-btn-secondary review-btn-block"
            data-action="jump-to-first"
            title="Jump to first change"
            aria-label="Jump to first change"
          >
            ⬆️ First Change
          </button>
          <button
            class="review-btn review-btn-secondary review-btn-block"
            data-action="jump-to-last"
            title="Jump to last change"
            aria-label="Jump to last change"
          >
            ⬇️ Last Change
          </button>
          <button
            class="review-btn review-btn-secondary review-btn-block"
            data-action="export-summary"
            title="Export summary as markdown"
            aria-label="Export summary as markdown"
          >
            📋 Export Summary
          </button>
        </div>
      </div>

      <div class="review-summary-details">
        <div class="review-details-header">
          <h4>Changes List</h4>
          <span class="review-details-count">${this.getChangesList().length} changes</span>
        </div>
        <div class="review-changes-list">
          ${this.renderChangesList()}
        </div>
      </div>
    `, this.summaryElement = t, this.attachDashboardHandlers(t), t;
    } catch (e) {
      xO.error("Failed to render change summary dashboard:", e);
      const t = document.createElement("div");
      return t.className = "review-change-summary-dashboard review-error", t.innerHTML = `
        <div class="review-summary-section">
          <div class="review-summary-header">
            <h3>📊 Change Summary</h3>
          </div>
          <div class="review-error-message">
            <p>Error loading change summary. Please refresh the page.</p>
          </div>
        </div>
      `, t;
    }
  }
  /**
   * Render the list of individual changes
   */
  renderChangesList() {
    const e = this.getChangesList();
    return e.length === 0 ? `
        <div class="review-changes-empty">
          <p>No changes yet. Start editing to see changes here.</p>
        </div>
      ` : e.map(
      (t, r) => `
          <div class="review-change-item" data-element-id="${t.elementId}">
            <div class="review-change-item-number">${r + 1}</div>
            <div class="review-change-item-content">
              <div class="review-change-item-header">
                <span class="review-change-item-type review-change-type-${t.type}">
                  ${this.getChangeTypeIcon(t.type)}
                </span>
                <span class="review-change-item-element">${t.elementType}</span>
              </div>
              <div class="review-change-item-preview">${sm(t.preview)}</div>
            </div>
            <button
              class="review-change-item-jump"
              data-action="jump-to-change"
              data-element-id="${t.elementId}"
              title="Jump to this change"
              aria-label="Jump to this change"
            >
              →
            </button>
          </div>
        `
    ).join("");
  }
  /**
   * Attach event handlers to dashboard
   */
  attachDashboardHandlers(e) {
    e.querySelector('[data-action="refresh"]')?.addEventListener("click", () => {
      const t = this.renderDashboard();
      this.summaryElement?.replaceWith(t);
    }), e.querySelector('[data-action="jump-to-first"]')?.addEventListener("click", () => {
      this.jumpToChange("first");
    }), e.querySelector('[data-action="jump-to-last"]')?.addEventListener("click", () => {
      this.jumpToChange("last");
    }), e.querySelector('[data-action="export-summary"]')?.addEventListener("click", () => {
      this.exportSummary();
    }), e.querySelectorAll('[data-action="jump-to-change"]').forEach((t) => {
      t.addEventListener("click", (r) => {
        const i = r.currentTarget.getAttribute("data-element-id");
        i && this.jumpToElement(i);
      });
    }), e.querySelectorAll(".review-change-item").forEach((t) => {
      t.addEventListener("click", (r) => {
        if (r.target.closest('[data-action="jump-to-change"]')) return;
        const i = t.getAttribute("data-element-id");
        i && this.jumpToElement(i);
      });
    });
  }
  /**
   * Jump to first or last change
   */
  jumpToChange(e) {
    const t = this.getChangesList();
    if (t.length === 0) return;
    const r = e === "first" ? 0 : t.length - 1, i = t[r];
    i && this.jumpToElement(i.elementId);
  }
  /**
   * Jump to element and highlight it
   */
  jumpToElement(e) {
    const t = document.querySelector(`[data-review-id="${e}"]`);
    t && (t.scrollIntoView({ behavior: "smooth", block: "center" }), t.classList.add("review-highlight-flash"), setTimeout(() => {
      t.classList.remove("review-highlight-flash");
    }, Fr("LONG_HIGHLIGHT")), t.classList.add("review-jump-target"), setTimeout(() => {
      t.classList.remove("review-jump-target");
    }, Fr("FLASH_HIGHLIGHT")));
  }
  /**
   * Export summary as markdown
   */
  exportSummary() {
    const e = this.summary || this.calculateSummary(), t = this.getChangesList();
    let r = `# Document Change Summary

`;
    r += `**Generated:** ${(/* @__PURE__ */ new Date()).toLocaleString()}

`, r += `## Statistics

`, r += `- **Total Changes:** ${e.totalChanges}
`, r += `- **Elements Modified:** ${e.elementsModified}
`, r += `- **Comments:** ${e.comments}
`, r += `- **Characters Added:** ${e.charactersAdded}
`, r += `- **Characters Removed:** ${e.charactersRemoved}

`, r += `## Change Breakdown

`, r += `- **Additions:** ${e.additions}
`, r += `- **Deletions:** ${e.deletions}
`, r += `- **Substitutions:** ${e.substitutions}

`, r += `## By Element Type

`;
    for (const [i, o] of e.changesByElementType)
      r += `- ${i}: ${o}
`;
    r += `
## All Changes

`, t.forEach((i, o) => {
      r += `${o + 1}. [${i.type.toUpperCase()}] ${i.elementType}
`, r += `   > ${i.preview}

`;
    }), navigator.clipboard.writeText(r).then(() => {
      this.showNotification("Summary copied to clipboard", "success");
    });
  }
  /**
   * Get icon for element type
   */
  getElementTypeIcon(e) {
    return {
      Header: "📝",
      Para: "¶",
      BulletList: "•",
      OrderedList: "1️⃣",
      CodeBlock: "💻",
      BlockQuote: "❝",
      Div: "📦"
    }[e] || "▪️";
  }
  /**
   * Get icon for change type
   */
  getChangeTypeIcon(e) {
    return {
      addition: "➕",
      deletion: "➖",
      substitution: "🔄"
    }[e] || "•";
  }
  /**
   * Show notification
   */
  showNotification(e, t) {
    const r = document.createElement("div");
    r.className = `review-notification review-notification-${t}`, r.textContent = e, r.setAttribute("role", "alert"), r.setAttribute("aria-live", "assertive"), r.setAttribute("aria-atomic", "true"), document.body.appendChild(r), setTimeout(() => {
      r.classList.add("review-notification-show");
    }, 10), setTimeout(() => {
      r.classList.remove("review-notification-show"), setTimeout(() => r.remove(), Fr("SLOW"));
    }, Rr.NOTIFICATION_DISPLAY_DURATION_MS);
  }
  /**
   * Destroy the dashboard and clean up event listeners
   */
  destroy() {
    this.summaryElement && (this.summaryElement.remove(), this.summaryElement = null), this.summary = null;
  }
}
const be = st("UIModule");
class EO {
  constructor(e) {
    T(this, "config");
    // Consolidated state objects (Phase 5)
    T(this, "editorState", cv());
    T(this, "uiState", uv());
    T(this, "commentState", dv());
    // Cache and utility maps
    T(this, "headingReferenceLookup", /* @__PURE__ */ new Map());
    T(this, "activeHeadingReferenceCache", /* @__PURE__ */ new Map());
    // Configuration
    T(this, "changeSummaryDashboard", null);
    // Module instances (for Phase 3 integration - will be used when code replacement completes)
    T(this, "editorLifecycle");
    T(this, "editorToolbarModule", null);
    T(this, "mainSidebarModule");
    T(this, "commentsSidebarModule", null);
    T(this, "commentComposerModule", null);
    T(this, "commentBadgesModule", null);
    T(this, "contextMenuCoordinator", null);
    T(this, "commentController");
    T(this, "historyStorage");
    T(this, "globalShortcutsBound", !1);
    this.config = e, be.debug("Initialized with tracked changes:", this.editorState.showTrackedChanges), this.editorLifecycle = new fO(), this.editorToolbarModule = new cb(), this.mainSidebarModule = new bO(), this.commentsSidebarModule = new pO(), this.commentComposerModule = new mO(), this.commentBadgesModule = new gO(), this.commentController = new yO({
      config: {
        changes: this.config.changes,
        comments: this.config.comments,
        markdown: this.config.markdown
      },
      commentState: this.commentState,
      sidebar: this.commentsSidebarModule,
      composer: this.commentComposerModule,
      badges: this.commentBadgesModule,
      callbacks: {
        requestRefresh: () => this.refresh(),
        ensureSidebarVisible: () => this.refreshCommentUI({ showSidebar: !0 }),
        showNotification: (t, r) => this.showNotification(t, r),
        onComposerClosed: () => this.commentController.clearHighlight("composer")
      }
    }), this.contextMenuCoordinator = new wO({
      onEdit: (t) => {
        this.openEditor(t);
      },
      onComment: (t) => {
        this.config.changes.getElementById(t) && this.openCommentComposer({ elementId: t });
      }
    }), this.historyStorage = new SO({
      prefix: Rr.EDITOR_HISTORY_STORAGE_PREFIX,
      maxSize: Rr.MAX_HISTORY_SIZE_BYTES,
      maxStates: Rr.MAX_HISTORY_STATES
    }), this.mainSidebarModule.onUndo(() => {
      this.config.changes.undo() && this.refresh();
    }), this.mainSidebarModule.onRedo(() => {
      this.config.changes.redo() && this.refresh();
    }), this.mainSidebarModule.onTrackedChangesToggle((t) => {
      this.toggleTrackedChanges(t);
    }), this.mainSidebarModule.onShowComments(() => {
      this.commentsSidebarModule?.getIsVisible() ? this.commentsSidebarModule?.toggle() : this.refreshCommentUI({ showSidebar: !0 });
    }), this.mainSidebarModule.onToggleSidebar(() => {
      this.toggleSidebarCollapsed();
    }), this.cacheInitialHeadingReferences(), this.initializeSidebar(), requestAnimationFrame(() => {
      this.refreshCommentUI();
    });
  }
  /**
   * Initialize the persistent sidebar on page load
   */
  initializeSidebar() {
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => {
      this.getOrCreateToolbar();
    }) : this.getOrCreateToolbar();
  }
  toggleSidebarCollapsed(e) {
    const t = this.getOrCreateToolbar(), r = typeof e == "boolean" ? e : !t.classList.contains("review-sidebar-collapsed");
    this.applySidebarCollapsedState(r, t);
  }
  applySidebarCollapsedState(e, t) {
    const r = t ?? this.getOrCreateToolbar();
    this.uiState.isSidebarCollapsed = e, r.classList.toggle("review-sidebar-collapsed", e), document.body && document.body.classList.toggle("review-sidebar-collapsed-mode", e), this.mainSidebarModule.setCollapsed(e);
  }
  /**
   * Toggle visibility of tracked changes
   */
  toggleTrackedChanges(e) {
    const t = typeof e == "boolean" ? e : !this.editorState.showTrackedChanges;
    if (this.editorState.showTrackedChanges === t) {
      this.mainSidebarModule.setTrackedChangesVisible(t);
      return;
    }
    this.editorState.showTrackedChanges = t, this.mainSidebarModule.setTrackedChangesVisible(t), this.refresh();
  }
  /**
   * Get current tracked changes mode
   */
  isShowingTrackedChanges() {
    return this.editorState.showTrackedChanges;
  }
  attachEventListeners() {
    this.bindEditableElements(document), this.bindGlobalShortcuts();
  }
  bindEditableElementEvents(e) {
    e.dataset.reviewEventsBound !== "true" && (e.dataset.reviewEventsBound = "true", e.addEventListener("click", (t) => {
      if (this.shouldIgnoreInteraction(t, e) || t instanceof MouseEvent && t.detail > 1)
        return;
      if (t.stopPropagation(), t.preventDefault(), e.getAttribute("data-review-id")) {
        const i = t;
        this.contextMenuCoordinator?.openFromEvent(e, i);
      }
    }), e.addEventListener("dblclick", (t) => {
      if (this.shouldIgnoreInteraction(t, e))
        return;
      t.preventDefault();
      const r = e.getAttribute("data-review-id");
      r && this.openEditor(r);
    }), e.addEventListener("mouseenter", () => {
      e.classList.contains("review-editable-editing") || e.classList.add("review-hover");
    }), e.addEventListener("mouseleave", () => {
      e.classList.remove("review-hover");
    }), e.addEventListener("contextmenu", (t) => {
      t.preventDefault();
    }));
  }
  shouldIgnoreInteraction(e, t) {
    if (e instanceof MouseEvent && e.button !== 0 || t.classList.contains("review-editable-editing"))
      return !0;
    const r = e.target;
    return !!(r?.closest(".review-inline-editor-container") || r?.closest(".review-section-comment-indicator"));
  }
  bindEditableElements(e) {
    (e.querySelectorAll?.("[data-review-id]") ?? []).forEach((r) => {
      r instanceof HTMLElement && this.bindEditableElementEvents(r);
    });
  }
  bindGlobalShortcuts() {
    this.globalShortcutsBound || (this.globalShortcutsBound = !0, document.addEventListener("keydown", (e) => {
      e.key === "Escape" && this.editorState.activeEditor && this.closeEditor();
    }));
  }
  openEditor(e) {
    const t = document.querySelector(
      `[data-review-id="${e}"]`
    );
    if (!t) return;
    const i = (this.resolveListEditorTarget(t) ?? t).getAttribute("data-review-id");
    i && (i !== e && be.debug(
      `Redirecting edit to list root ${i} (clicked ${e})`
    ), this.config.inlineEditing ? this.openInlineEditor(i) : this.openModalEditor(i));
  }
  openModalEditor(e) {
    const t = document.querySelector(`[data-review-id="${e}"]`);
    if (!t) return;
    this.editorState.currentElementId = e, be.debug("Opening editor for", { elementId: e }), be.trace("Tracked changes enabled:", this.editorState.showTrackedChanges), this.restoreEditorHistory(e);
    const r = t.getAttribute("data-review-type") || "Para", { plainContent: i, trackedContent: o, diffHighlights: s } = this.createEditorSession(e, r);
    be.trace("Editor content (plain):", i), this.editorState.showTrackedChanges && be.trace("Editor content (tracked):", o);
    const l = this.createEditorModal(i, r);
    document.body.appendChild(l), this.editorState.activeEditor = l, requestAnimationFrame(() => {
      this.initializeMilkdown(l, i, s);
    });
  }
  openInlineEditor(e) {
    const t = document.querySelector(
      `[data-review-id="${e}"]`
    );
    if (!t) return;
    this.closeEditor(), this.editorState.currentElementId = e, this.restoreEditorHistory(e);
    const r = t.getAttribute("data-review-type") || "Para", { plainContent: i, diffHighlights: o } = this.createEditorSession(e, r);
    t.classList.add("review-editable-editing");
    const s = t.innerHTML;
    t.setAttribute("data-review-original-html", s), t.innerHTML = `
      <div class="review-inline-editor-container">
        <div class="review-inline-editor-body"></div>
        <div class="review-inline-editor-actions">
          <button class="review-btn review-btn-secondary review-btn-sm" data-action="cancel">Cancel</button>
          <button class="review-btn review-btn-primary review-btn-sm" data-action="save">Save</button>
        </div>
      </div>
    `;
    const l = t.querySelector(
      ".review-inline-editor-container"
    );
    this.editorState.activeEditor = l, l.querySelectorAll('[data-action="cancel"]').forEach((a) => {
      a.addEventListener("click", () => this.closeEditor());
    }), l.querySelector('[data-action="save"]')?.addEventListener("click", () => {
      this.saveEditor();
    }), requestAnimationFrame(() => {
      this.initializeMilkdown(l, i, o);
    });
  }
  async initializeMilkdown(e, t, r = []) {
    try {
      const i = this.editorState.currentElementId;
      let o = "default";
      if (i) {
        const l = document.querySelector(`[data-review-id="${i}"]`);
        l && (o = l.getAttribute("data-review-type") || "Para");
      }
      const s = await this.editorLifecycle.initialize({
        container: e,
        content: t,
        diffHighlights: r,
        elementType: o,
        onContentChange: (l) => {
          this.editorState.currentEditorContent = l;
        }
      });
      this.editorState.milkdownEditor = s, be.debug("Milkdown editor initialized successfully");
    } catch (i) {
      be.error("Failed to initialize Milkdown:", i);
      const o = e.querySelector(".review-editor-body") || e.querySelector(".review-inline-editor-body");
      o && (o.innerHTML = `
          <div style="padding:20px; color:red;">
            Failed to initialize editor. Please try again.
            <pre>${i instanceof Error ? i.message : String(i)}</pre>
          </div>
        `), this.editorState.activeEditorToolbar = null, this.editorLifecycle.destroy(), this.editorState.milkdownEditor = null;
    }
  }
  closeEditor() {
    if (this.editorState.currentElementId && this.saveEditorHistory(this.editorState.currentElementId), this.editorLifecycle.destroy(), this.editorState.milkdownEditor = null, this.editorState.activeEditorToolbar = null, this.editorState.activeEditor) {
      if (this.config.inlineEditing && this.editorState.currentElementId) {
        const e = document.querySelector(
          `[data-review-id="${this.editorState.currentElementId}"]`
        );
        if (e) {
          e.classList.remove("review-editable-editing");
          const t = e.getAttribute("data-review-original-html");
          t !== null && (e.innerHTML = t, e.removeAttribute("data-review-original-html")), this.editorState.currentElementId && this.commentController.clearSectionCommentMarkup(this.editorState.currentElementId);
        }
      } else
        this.editorState.activeEditor.remove();
      this.editorState.activeEditor = null, this.editorState.currentElementId && this.activeHeadingReferenceCache.delete(this.editorState.currentElementId), this.editorState.currentElementId = null, this.editorState.currentEditorContent = "";
    }
  }
  saveEditor() {
    if (!this.editorState.milkdownEditor || !this.editorState.currentElementId) return;
    const e = this.editorState.currentElementId;
    let t = Zi(this.editorState.currentEditorContent);
    const r = this.activeHeadingReferenceCache.get(e);
    r && (t = this.applyHeadingReference(
      t,
      r
    )), this.editorState.currentEditorContent = t;
    const i = this.config.changes.getElementById(e);
    if (!i) {
      be.error("Element not found for save:", { elementId: e }), this.closeEditor();
      return;
    }
    const o = this.commentController.consumeSectionCommentMarkup(e), s = this.segmentContentIntoElements(
      t,
      i.metadata
    );
    o && CO(
      s,
      o,
      i.metadata,
      (p, m) => this.commentController.appendSectionComments(p, m)
    );
    const l = Zi(
      this.config.changes.getElementContent(e)
    ), a = this.commentController.extractSectionComments(l).content, c = s[0]?.content ?? "", u = Kf(a), d = Kf(c);
    be.debug("Saving editor"), be.trace("Original primary:", a), be.trace("New primary:", c);
    const { elementIds: h, removedIds: f } = this.config.changes.replaceElementWithSegments(e, s);
    if (this.ensureSegmentDom(h, s, f), this.commentController.clearSectionCommentMarkup(e), this.commentController.clearSectionCommentMarkupFor(f), o && h.length > 0) {
      const p = h[h.length - 1];
      typeof p == "string" && this.commentController.cacheSectionCommentMarkup(
        p,
        o
      );
    }
    this.updateHeadingReferencesAfterSave(
      e,
      s,
      h,
      f
    ), u === d && s.length === 1 && be.debug("No meaningful content change detected for primary segment"), this.closeEditor(), this.refresh();
  }
  createEditorModal(e, t) {
    const r = document.createElement("div");
    return r.className = "review-editor-modal", r.innerHTML = `
      <div class="review-editor-container">
        <div class="review-editor-header">
          <h3>Edit ${t}</h3>
          <button class="review-btn review-btn-secondary" data-action="close">✕</button>
        </div>
        <div class="review-editor-body"></div>
        <div class="review-editor-footer">
          <button class="review-btn review-btn-secondary" data-action="cancel">Cancel</button>
          <button class="review-btn review-btn-primary" data-action="save">Save</button>
        </div>
      </div>
    `, r.querySelector('[data-action="close"]')?.addEventListener("click", () => this.closeEditor()), r.querySelector('[data-action="cancel"]')?.addEventListener("click", () => this.closeEditor()), r.querySelector('[data-action="save"]')?.addEventListener("click", () => this.saveEditor()), r.addEventListener("click", (i) => {
      i.target === r && this.closeEditor();
    }), r;
  }
  refresh() {
    const e = this.config.changes.getCurrentState(), t = this.config.changes.getOperations(), r = new Set(
      t.filter((i) => i.type === "edit").map((i) => i.elementId)
    );
    e.forEach((i) => {
      const o = t.filter(
        (a) => a.elementId === i.id
      ), s = o.length > 0, l = i.id === this.editorState.currentElementId || document.querySelector(`[data-review-id="${i.id}"][data-review-modified="true"]`);
      if (!(!s && !l))
        if (this.editorState.showTrackedChanges)
          if (o.some((c) => c.type === "edit")) {
            const c = this.config.changes.getElementContentWithTrackedChanges(i.id), u = {
              ...i,
              content: c
            };
            this.updateElementDisplay(u);
          } else
            this.updateElementDisplay(i);
        else
          this.updateElementDisplay(i);
    }), e.forEach((i) => {
      const o = document.querySelector(`[data-review-id="${i.id}"]`);
      o && (r.has(i.id) ? o.setAttribute("data-review-modified", "true") : o.removeAttribute("data-review-modified"));
    }), this.updateUnsavedIndicator(), this.refreshCommentUI(), this.syncToolbarState();
  }
  /**
   * Clean nested review-editable div fences from markdown content
   * Removes patterns like: ::: {class="review-editable" ...} content :::
   */
  cleanNestedDivs(e) {
    return e.replace(
      /:::\s*\{[^}]*review-editable[^}]*\}[\s\S]*?:::/g,
      ""
    );
  }
  prepareEditorContent(e, t, r, i = {}) {
    const { skipHeadingCache: o = !1 } = i;
    if (r !== "Header")
      return o || this.activeHeadingReferenceCache.delete(e), t;
    const s = this.ensureHeadingReferenceInfo(
      e,
      t
    );
    if (s) {
      const l = this.removeHeadingReference(
        t,
        s
      );
      return o || this.activeHeadingReferenceCache.set(e, s), l;
    }
    return o || this.activeHeadingReferenceCache.delete(e), t;
  }
  prepareEditorContentVariants(e, t, r) {
    const i = this.config.changes.getElementContent(e), o = r ? this.config.changes.getElementContentWithTrackedChanges(e) : i, s = this.cleanNestedDivs(i), l = this.cleanNestedDivs(o), a = this.prepareEditorContent(
      e,
      s,
      t
    ), c = this.prepareEditorContent(
      e,
      l,
      t,
      { skipHeadingCache: !0 }
    ), u = this.commentController.extractSectionComments(a), d = this.commentController.extractSectionComments(c);
    return {
      plainContent: u.content,
      trackedContent: d.content,
      commentMarkup: u.commentMarkup
    };
  }
  createEditorSession(e, t) {
    const { plainContent: r, trackedContent: i, commentMarkup: o } = this.prepareEditorContentVariants(
      e,
      t,
      this.editorState.showTrackedChanges
    );
    this.commentController.cacheSectionCommentMarkup(e, o);
    const s = this.editorState.showTrackedChanges ? this.computeDiffHighlightRanges(i) : [];
    return { plainContent: r, trackedContent: i, diffHighlights: s };
  }
  updateHeadingReferencesAfterSave(e, t, r, i) {
    this.headingReferenceLookup.delete(e), i.forEach((o) => {
      this.headingReferenceLookup.delete(o), this.activeHeadingReferenceCache.delete(o);
    }), r.forEach((o, s) => {
      const l = t[s];
      !l || !o || l.metadata?.type === "Header" && this.syncHeadingReference(o, l.content);
    });
  }
  computeDiffHighlightRanges(e) {
    if (!e)
      return [];
    const t = [], r = /\{\+\+([\s\S]*?)\+\+\}/g;
    let i;
    for (; (i = r.exec(e)) !== null; ) {
      const l = i?.index ?? 0, a = i?.[1] ?? "";
      if (!a)
        continue;
      const c = e.slice(0, l), u = this.plainLengthForDiff(c), d = this.plainifyForDiff(a);
      d && t.push({
        start: u,
        end: u + d.length,
        type: "addition"
      });
    }
    const o = /\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g;
    let s;
    for (; (s = o.exec(e)) !== null; ) {
      const l = s?.index ?? 0, a = s?.[2] ?? "";
      if (!a)
        continue;
      const c = e.slice(0, l), u = this.plainLengthForDiff(c), d = this.plainifyForDiff(a);
      d && t.push({
        start: u,
        end: u + d.length,
        type: "modification"
      });
    }
    return t;
  }
  plainLengthForDiff(e) {
    return e ? this.plainifyForDiff(e).length : 0;
  }
  plainifyForDiff(e) {
    return e ? e.replace(/\{\+\+([\s\S]*?)\+\+\}/g, "$1").replace(/\{--([\s\S]*?)--\}/g, "").replace(/\{~~([\s\S]*?)~>([\s\S]*?)~~\}/g, "$2").replace(/\{==([\s\S]*?)==\}/g, "$1").replace(/\{>>([\s\S]*?)<<\}/g, "") : "";
  }
  segmentContentIntoElements(e, t) {
    if (!e.trim())
      return [
        {
          content: "",
          metadata: t
        }
      ];
    const o = this.config.markdown.parseToAST(e).children;
    if (!o || o.length === 0)
      return [
        {
          content: e,
          metadata: t
        }
      ];
    const s = this.buildLineOffsets(e), l = [];
    return o.forEach((a, c) => {
      const u = this.positionToIndex(s, a.position?.start), d = o[c + 1], h = d ? this.positionToIndex(s, d.position?.start) : e.length;
      let f = e.slice(u, h);
      if (f = this.normalizeSegmentContent(f), !f.trim())
        return;
      const p = this.deriveMetadataFromNode(
        a,
        c === 0 ? t : void 0
      );
      l.push({
        content: f,
        metadata: p
      });
    }), l.length === 0 ? [
      {
        content: e,
        metadata: t
      }
    ] : l;
  }
  buildLineOffsets(e) {
    const t = [0];
    let r = 0;
    const i = e.length;
    for (; r < i; ) {
      const o = e[r];
      if (o === "\r") {
        if (r + 1 < i && e[r + 1] === `
`) {
          t.push(r + 2), r += 2;
          continue;
        }
        t.push(r + 1), r += 1;
        continue;
      }
      o === `
` && t.push(r + 1), r += 1;
    }
    return t;
  }
  positionToIndex(e, t) {
    if (!t)
      return 0;
    const r = ("line" in t, t.line), i = ("column" in t, t.column), o = Math.max(0, Math.min(e.length - 1, r - 1));
    return (e[o] ?? 0) + Math.max(0, i - 1);
  }
  normalizeSegmentContent(e) {
    let t = e;
    const r = /^(?:\s*\r?\n)+/, i = /(\r?\n\s*)+$/;
    return t = t.replace(r, ""), t = t.replace(i, (o) => o.includes(`
`) ? "" : o), t.trimEnd();
  }
  deriveMetadataFromNode(e, t) {
    switch (e.type) {
      case "heading":
        return {
          type: "Header",
          level: e.depth,
          attributes: t && t.type === "Header" ? { ...t.attributes } : void 0,
          classes: t && t.type === "Header" ? [...t.classes ?? []] : void 0
        };
      case "code":
        return {
          type: "CodeBlock"
        };
      case "list":
        return {
          type: e.ordered ? "OrderedList" : "BulletList"
        };
      case "blockquote":
        return {
          type: "BlockQuote"
        };
      case "table":
        return {
          type: "Div"
        };
      case "paragraph":
        return {
          type: "Para",
          attributes: t && t.type === "Para" ? { ...t.attributes } : void 0,
          classes: t && t.type === "Para" ? [...t.classes ?? []] : void 0
        };
      default:
        return t ? {
          ...t
        } : {
          type: "Div"
        };
    }
  }
  ensureSegmentDom(e, t, r) {
    this.removeObsoleteSegmentNodes(r), this.syncSegmentNodes(e, t);
  }
  removeObsoleteSegmentNodes(e) {
    e.forEach((t) => {
      const r = document.querySelector(
        `[data-review-id="${t}"]`
      );
      r?.parentElement && r.parentElement.removeChild(r);
    });
  }
  syncSegmentNodes(e, t) {
    for (let r = 1; r < e.length; r++) {
      const i = e[r], o = e[r - 1];
      if (!i || !o)
        continue;
      const s = document.querySelector(
        `[data-review-id="${i}"]`
      );
      if (!s) {
        this.createAndInsertSegmentNode(i, o, t[r]);
        continue;
      }
      this.ensureSegmentOrder(s, o);
    }
  }
  createAndInsertSegmentNode(e, t, r) {
    const i = r?.metadata;
    if (!r || !i)
      return;
    const o = this.createEditableShell(e, i);
    this.insertEditableAfter(t, o), this.bindEditableElementEvents(o);
  }
  ensureSegmentOrder(e, t) {
    const r = document.querySelector(
      `[data-review-id="${t}"]`
    );
    if (!r || !r.parentNode)
      return;
    const i = r.parentNode, o = r.nextSibling;
    (e.parentNode !== i || e.previousSibling !== r) && i.insertBefore(e, o);
  }
  createEditableShell(e, t) {
    const r = document.createElement("div");
    return r.className = "review-editable review-editable-generated", r.setAttribute("data-review-id", e), r.setAttribute("data-review-type", t.type), t.level && r.setAttribute("data-review-level", String(t.level)), r.setAttribute("data-review-origin", "generated"), r;
  }
  insertEditableAfter(e, t) {
    const r = document.querySelector(
      `[data-review-id="${e}"]`
    );
    if (r && r.parentNode) {
      r.parentNode.insertBefore(t, r.nextSibling);
      return;
    }
    document.body.appendChild(t);
  }
  syncToolbarState() {
    const e = this.config.changes.canUndo(), t = this.config.changes.canRedo();
    this.mainSidebarModule.updateUndoRedoState(e, t), this.mainSidebarModule.setTrackedChangesVisible(this.editorState.showTrackedChanges);
  }
  cacheInitialHeadingReferences() {
    try {
      this.config.changes.getCurrentState().forEach((t) => {
        if (t.metadata.type !== "Header")
          return;
        const r = this.extractHeadingReferenceInfo(t.content);
        r && this.headingReferenceLookup.set(t.id, r);
      });
    } catch (e) {
      be.debug(
        "Skipped initial heading reference cache:",
        e
      );
    }
  }
  ensureHeadingReferenceInfo(e, t) {
    const r = this.headingReferenceLookup.get(e);
    if (r)
      return r;
    const i = this.extractHeadingReferenceInfo(t);
    return i ? (this.headingReferenceLookup.set(e, i), i) : null;
  }
  extractHeadingReferenceInfo(e) {
    if (!e)
      return null;
    const t = e.includes(`\r
`) ? `\r
` : `
`, r = e.split(t);
    if (r.length === 0)
      return null;
    const i = r[0], o = i ? wi(i) : "", s = o.lastIndexOf("}");
    if (s === -1 || s !== o.length - 1)
      return null;
    const l = o.lastIndexOf("{", s);
    if (l === -1)
      return null;
    const a = o.slice(l, s + 1).trim();
    if (!a.startsWith("{#"))
      return null;
    let c = l;
    for (; c > 0 && o.charAt(c - 1) === " "; )
      c--;
    const u = o.slice(c, l), h = gh(o).startsWith("#") ? "atx" : "setext";
    return {
      reference: a,
      prefix: u,
      style: h
    };
  }
  removeHeadingReference(e, t) {
    if (!e)
      return e;
    const r = e.includes(`\r
`) ? `\r
` : `
`, i = e.split(r);
    if (i.length === 0)
      return e;
    const o = i[0];
    if (!o)
      return e;
    const s = o.lastIndexOf(t.reference);
    if (s === -1)
      return e;
    const l = s - t.prefix.length;
    if (l < 0)
      return e;
    const a = o.slice(l, s);
    let c = s;
    if (t.prefix.length > 0)
      if (a === t.prefix)
        c = l;
      else {
        let h = s;
        for (; h > 0 && $s(o.charAt(h - 1)); )
          h--;
        c = h;
      }
    else
      for (; c > 0 && $s(o.charAt(c - 1)); )
        c--;
    const u = o.slice(0, c), d = o.slice(s + t.reference.length);
    return i[0] = wi(u + d), i.join(r);
  }
  applyHeadingReference(e, t) {
    if (!e)
      return e;
    const r = this.removeHeadingReference(e, t), i = r.includes(`\r
`) ? `\r
` : `
`, o = r.split(i);
    if (o.length === 0)
      return r;
    const s = o[0];
    if (!s)
      return r;
    const a = gh(s).startsWith("#"), c = o.length > 1 ? o[1] : void 0, u = c ? lv(wi(c)) : !1;
    if (t.style === "atx" && !a || t.style === "setext" && !u)
      return r;
    const d = t.prefix.length > 0 ? t.prefix : " ", h = wi(s);
    return o[0] = wi(
      `${h}${d}${t.reference}`
    ), o.join(i);
  }
  syncHeadingReference(e, t) {
    const r = this.extractHeadingReferenceInfo(t);
    r ? this.headingReferenceLookup.set(e, r) : this.headingReferenceLookup.delete(e);
  }
  updateElementDisplay(e) {
    const t = document.querySelector(
      `[data-review-id="${e.id}"]`
    );
    if (!t) return;
    t.setAttribute("data-review-type", e.metadata.type), e.metadata.level !== void 0 ? t.setAttribute("data-review-level", String(e.metadata.level)) : t.removeAttribute("data-review-level");
    let r = this.cleanNestedDivs(e.content);
    if (e.metadata.type === "Header") {
      const c = this.ensureHeadingReferenceInfo(
        e.id,
        r
      );
      c && (r = this.removeHeadingReference(
        r,
        c
      )), r = this.normalizeCriticMarkupNewlines(r);
    }
    be.trace("Updating display for", { elementId: e.id }), be.trace("Content:", r);
    const i = this.config.markdown.renderElement(
      r,
      e.metadata.type,
      e.metadata.level
    );
    if (be.trace("Rendered HTML:", i), t.classList.contains("review-editable-editing"))
      return;
    const o = t.querySelector(
      ":scope > :not([data-review-id]):not(.review-section-comment-indicator)"
    );
    Array.from(t.childNodes).filter((c) => !(c === o || c instanceof HTMLElement && (c.classList.contains("review-section-comment-indicator") || c.hasAttribute("data-review-id")))).forEach((c) => {
      c.parentNode === t && t.removeChild(c);
    });
    const l = document.createElement("div");
    l.innerHTML = i;
    const a = [];
    for (; l.firstChild; ) {
      const c = l.firstChild;
      a.push(c), l.removeChild(c);
    }
    if (o) {
      const c = a.find(
        (u) => u instanceof HTMLElement
      );
      if (c && o instanceof HTMLElement) {
        const u = /* @__PURE__ */ new Set();
        c.className.split(/\s+/).filter(Boolean).forEach((d) => u.add(d)), o.classList.forEach((d) => u.add(d)), c.className = Array.from(u).join(" "), Array.from(o.attributes).forEach((d) => {
          d.name !== "class" && (c.hasAttribute(d.name) || c.setAttribute(d.name, d.value));
        });
      }
      if (a.length > 0) {
        const u = this.wrapSectionContent(
          o.getAttribute("data-review-wrapper") === "true",
          a
        );
        o.replaceWith(u);
      } else
        o.remove();
    } else if (a.length > 0) {
      const c = t.querySelector(
        ":scope > .review-section-comment-indicator"
      ), u = this.wrapSectionContent(!1, a);
      c ? t.insertBefore(u, c) : t.appendChild(u);
    }
    this.commentController.sanitizeInlineCommentArtifacts(t);
  }
  /**
   * Normalize newlines within CriticMarkup for single-line contexts (like headings)
   * Converts: {++ test\n++} → {++ test ++}
   */
  normalizeCriticMarkupNewlines(e) {
    return e.replace(/\{\+\+([\s\S]+?)\+\+\}/g, (t, r) => `{++${r.replace(/\s+/g, " ").trim()}++}`).replace(/\{--([\s\S]+?)--\}/g, (t, r) => `{--${r.replace(/\s+/g, " ").trim()}--}`).replace(/\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g, (t, r, i) => `{~~${r.replace(/\s+/g, " ").trim()}~>${i.replace(/\s+/g, " ").trim()}~~}`).replace(/\{>>([\s\S]+?)<<\}/g, (t, r) => `{>>${r.replace(/\s+/g, " ").trim()}<<}`).replace(/\{==([\s\S]+?)==\}/g, (t, r) => `{==${r.replace(/\s+/g, " ").trim()}==}`);
  }
  /**
   * For list items/sub-lists, resolve the highest ancestor list element so edits apply to the full list.
   */
  resolveListEditorTarget(e) {
    const t = '[data-review-type="BulletList"], [data-review-type="OrderedList"]';
    let r = e.closest(t);
    if (!r)
      return null;
    let i = r;
    for (; r; ) {
      const o = r.parentElement?.closest(
        t
      );
      if (!o) break;
      i = o, r = o;
    }
    return i;
  }
  updateUnsavedIndicator() {
    const e = this.config.changes.hasUnsavedOperations();
    e && this.getOrCreateToolbar(), this.mainSidebarModule.setHasUnsavedChanges(e);
  }
  getOrCreateToolbar() {
    let e = document.querySelector(".review-toolbar");
    return e || (e = this.createPersistentSidebar(), document.body.appendChild(e), this.mainSidebarModule.setTrackedChangesVisible(this.editorState.showTrackedChanges), this.syncToolbarState(), this.applySidebarCollapsedState(this.uiState.isSidebarCollapsed, e)), e;
  }
  /**
   * Create persistent sidebar with all controls
   */
  createPersistentSidebar() {
    const e = this.mainSidebarModule.create();
    return this.changeSummaryDashboard || (this.changeSummaryDashboard = new vO(this.config)), e;
  }
  openCommentComposer(e) {
    this.contextMenuCoordinator?.close(), this.commentsSidebarModule?.show();
    const t = e.existingComment ? `${e.elementId}:${e.existingComment.start}` : void 0;
    this.commentController.openComposer({
      elementId: e.elementId,
      existingComment: e.existingComment,
      commentKey: t
    }), this.commentController.highlightSection(e.elementId, "composer", t);
  }
  refreshCommentUI(e = {}) {
    this.commentController.refreshUI({
      showSidebar: e.showSidebar
    });
  }
  wrapSectionContent(e, t) {
    if (e) {
      const o = document.createDocumentFragment();
      t.forEach((l) => o.appendChild(l));
      const s = document.createElement("div");
      return s.setAttribute("data-review-wrapper", "true"), s.className = "review-section-wrapper", s.appendChild(o), s;
    }
    const r = document.createElement("div");
    r.className = "review-section-wrapper", r.setAttribute("data-review-wrapper", "true");
    const i = document.createDocumentFragment();
    return t.forEach((o) => i.appendChild(o)), r.appendChild(i), r;
  }
  /**
   * Scroll to and highlight an element
   */
  /**
   * Remove a comment from the content
   */
  showNotification(e, t = "info") {
    const r = document.createElement("div");
    r.className = `review-notification review-notification-${t}`, r.textContent = e, document.body.appendChild(r), setTimeout(() => {
      r.classList.add("review-notification-show");
    }, 10), setTimeout(() => {
      r.classList.remove("review-notification-show"), setTimeout(() => r.remove(), Fr("SLOW"));
    }, Rr.NOTIFICATION_DISPLAY_DURATION_MS);
  }
  showLoading(e = "Loading...") {
    const t = document.createElement("div");
    return t.className = "review-loading", t.innerHTML = `
      <div class="review-loading-content">
        <div class="review-loading-spinner"></div>
        <p>${e}</p>
      </div>
    `, document.body.appendChild(t), t;
  }
  hideLoading(e) {
    e.remove();
  }
  destroy() {
    this.closeEditor(), this.editorToolbarModule?.destroy(), this.commentsSidebarModule?.destroy(), this.commentComposerModule?.destroy(), this.commentBadgesModule?.destroy(), this.contextMenuCoordinator?.destroy(), this.changeSummaryDashboard?.destroy(), this.mainSidebarModule.destroy(), document.querySelector(".review-toolbar")?.remove(), document.querySelectorAll(".review-editable").forEach((r) => {
      const i = r.cloneNode(!0);
      r.parentNode?.replaceChild(i, r);
    });
  }
  /**
   * Save editor history to persistent localStorage for undo/redo
   * Stores multiple snapshots of editor content per section
  */
  saveEditorHistory(e) {
    e && this.historyStorage.save(e, this.editorState.currentEditorContent);
  }
  /**
   * Restore editor history from persistent storage
   */
  restoreEditorHistory(e) {
    const t = this.historyStorage.get(e);
    t.states.length !== 0 && be.debug("Editor history restored for element", {
      elementId: e,
      stateCount: t.states.length,
      lastUpdated: new Date(t.lastUpdated).toLocaleString()
    });
  }
  /**
   * Get all stored editor histories for debugging/info
   */
  getStoredHistories() {
    return this.historyStorage.list();
  }
  /**
   * Clear editor history for a specific element
   */
  clearElementHistory(e) {
    this.historyStorage.clear(e);
  }
  /**
   * Clear all editor histories
   */
  clearAllHistories() {
    this.historyStorage.clearAll();
  }
}
const Jf = st("GitConfig"), Gf = "main", MO = "header", TO = [
  "github",
  "gitlab",
  "gitea",
  "forgejo",
  "azure-devops",
  "local"
];
function NO(n) {
  if (!n)
    return null;
  const e = IO(n.provider);
  if (!e)
    return Jf.warn(
      "Git integration disabled: missing or unsupported `review.git.provider` configuration"
    ), null;
  const t = (n.owner || "").trim(), r = (n.repo || "").trim();
  if (!t || !r)
    return Jf.warn(
      "Git integration disabled: `review.git.owner` and `review.git.repo` are required"
    ), null;
  const i = (n.baseBranch || n["base-branch"] || Gf).trim() || Gf, o = n.sourceFile || n["source-file"] || void 0, s = AO(n.auth);
  return {
    config: {
      provider: e,
      repository: {
        owner: t,
        name: r,
        baseBranch: i,
        sourceFile: o
      },
      auth: s ?? void 0,
      options: n.options
    },
    raw: n
  };
}
function IO(n) {
  if (!n) return null;
  const e = n.toLowerCase().trim();
  return TO.includes(e) ? e : null;
}
function AO(n) {
  if (!n)
    return null;
  const e = OO(n), t = n, r = Ir(t, "headerName") || Ir(t, "header-name"), i = Ir(t, "cookieName") || Ir(t, "cookie-name"), o = Ir(t, "token");
  return {
    mode: e,
    headerName: r || "Authorization",
    cookieName: i || void 0,
    token: o || void 0
  };
}
function OO(n) {
  const e = n?.mode?.toLowerCase();
  return e === "header" || e === "cookie" || e === "pat" ? e : Ir(n, "token") ? "pat" : MO;
}
function Ir(n, e) {
  if (!n) return;
  const t = n[e];
  if (typeof t == "string") {
    const r = t.trim();
    return r.length > 0 ? r : void 0;
  }
}
class Rl {
  constructor(e) {
    T(this, "config");
    this.config = e;
  }
  /**
   * Perform a raw API request.
   */
  async request(e, t = {}) {
    if (!this.config.url)
      throw new Error("Provider URL is not configured");
    const r = this.getAuthHeader(), i = this.config.auth?.headerName || "Authorization", o = {
      Accept: "application/json",
      ...r ? { [i]: r } : {},
      ...t.headers ?? {}
    }, s = {
      ...t,
      headers: o
    };
    this.config.auth?.mode === "cookie" && (s.credentials = s.credentials ?? "include");
    const l = e.startsWith("http") || e.startsWith("https") ? e : `${this.config.url}${e}`, a = await fetch(l, s);
    if (!a.ok)
      throw await this.toApiError(a);
    if (a.status === 204)
      return;
    const c = await a.text();
    if (c)
      try {
        return JSON.parse(c);
      } catch (u) {
        throw new Error(
          `Failed to parse provider response: ${u.message}`
        );
      }
  }
  /**
   * Convert a non-OK response to an informative error.
   */
  async toApiError(e) {
    let t = `${e.status} ${e.statusText}`;
    try {
      const i = await e.json();
      i && typeof i.message == "string" && (t = i.message);
    } catch {
    }
    const r = new Error(t);
    return r.status = e.status, r;
  }
}
function RO(n) {
  if (typeof atob == "function")
    return decodeURIComponent(
      Array.prototype.map.call(
        atob(n),
        (e) => `%${`00${e.charCodeAt(0).toString(16)}`.slice(-2)}`
      ).join("")
    );
  if (typeof Buffer < "u")
    return Buffer.from(n, "base64").toString("utf-8");
  throw new Error("Base64 decoding is not supported in this environment");
}
function DO(n) {
  if (typeof btoa == "function")
    return btoa(unescape(encodeURIComponent(n)));
  if (typeof Buffer < "u")
    return Buffer.from(n, "utf-8").toString("base64");
  throw new Error("Base64 encoding is not supported in this environment");
}
class LO extends Rl {
  getAuthHeader() {
    if (this.config.auth?.mode !== "cookie") {
      if (this.config.auth?.token)
        return `Bearer ${this.config.auth.token}`;
      if (this.config.token)
        return `Bearer ${this.config.token}`;
    }
  }
  async getCurrentUser() {
    const e = await this.request("/user");
    return {
      login: e.login,
      name: e.name ?? void 0,
      avatarUrl: e.avatar_url ?? void 0
    };
  }
  async createBranch(e, t) {
    const r = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${t}`
    ), i = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/git/refs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: `refs/heads/${e}`,
          sha: r.object.sha
        })
      }
    );
    return {
      name: i.ref,
      sha: i.object.sha
    };
  }
  async getFileContent(e, t) {
    try {
      const r = await this.request(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(
          e
        )}?ref=${encodeURIComponent(t)}`,
        {
          headers: { Accept: "application/vnd.github.v3+json" }
        }
      );
      return {
        path: r.path,
        sha: r.sha,
        content: RO(r.content)
      };
    } catch (r) {
      if (r instanceof Error && r.status === 404)
        return null;
      throw r;
    }
  }
  async createOrUpdateFile(e, t, r, i, o) {
    const s = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(
        e
      )}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: r,
          content: DO(t),
          branch: i,
          sha: o
        })
      }
    );
    return {
      path: s.content.path,
      sha: s.content.sha,
      commitSha: s.commit.sha,
      url: s.content.html_url
    };
  }
  async createPullRequest(e, t, r, i) {
    const o = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: e, body: t, head: r, base: i })
      }
    );
    return this.mapPullRequest(o);
  }
  async updatePullRequest(e, t) {
    const r = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${e}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.title,
          body: t.body
        })
      }
    );
    return this.mapPullRequest(r);
  }
  async getPullRequest(e) {
    const t = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${e}`
    );
    return this.mapPullRequest(t);
  }
  async listPullRequests(e = "open") {
    return (await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls?state=${e}`
    )).map((r) => this.mapPullRequest(r));
  }
  async mergePullRequest(e, t = "merge") {
    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${e}/merge`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge_method: t })
      }
    );
  }
  async createReviewComments(e, t, r) {
    if (!t.length)
      return [];
    const i = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${e}/reviews`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify({
          commit_id: r,
          event: "COMMENT",
          comments: t.map((o) => ({
            path: o.path,
            line: o.line,
            side: o.side ?? "RIGHT",
            body: o.body
          }))
        })
      }
    );
    return i?.comments ? i.comments.map((o) => ({
      id: o.id,
      url: o.html_url,
      path: o.path,
      line: o.line
    })) : [];
  }
  async createIssue(e, t) {
    const r = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: e, body: t })
      }
    );
    return this.mapIssue(r);
  }
  async getIssue(e) {
    const t = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${e}`
    );
    return this.mapIssue(t);
  }
  async listIssues(e = "open") {
    return (await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues?state=${e}`
    )).map((r) => this.mapIssue(r));
  }
  async addPullRequestComment(e, t) {
    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${e}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t })
      }
    );
  }
  async addIssueComment(e, t) {
    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${e}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t })
      }
    );
  }
  async getRepository() {
    const e = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}`
    );
    return {
      name: e.name,
      description: e.description,
      url: e.html_url,
      defaultBranch: e.default_branch
    };
  }
  async hasWriteAccess() {
    return !!(await this.request(
      `/repos/${this.config.owner}/${this.config.repo}`
    )).permissions?.push;
  }
  mapPullRequest(e) {
    return {
      number: e.number,
      title: e.title,
      body: e.body,
      state: e.merged_at ? "merged" : e.state,
      author: e.user.login,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      url: e.html_url
    };
  }
  mapIssue(e) {
    return {
      number: e.number,
      title: e.title,
      body: e.body,
      state: e.state,
      author: e.user.login,
      createdAt: e.created_at,
      url: e.html_url
    };
  }
}
class PO extends Rl {
  constructor(t) {
    super({
      url: t.url || "https://gitlab.com/api/v4",
      ...t
    });
    T(this, "projectId");
    this.projectId = t.projectId || `${t.owner}%2F${t.repo}`;
  }
  getAuthHeader() {
    return `Bearer ${this.config.token}`;
  }
  async getCurrentUser() {
    return this.notImplemented();
  }
  async createBranch(t, r) {
    return this.notImplemented();
  }
  async getFileContent(t, r) {
    return this.notImplemented();
  }
  async createOrUpdateFile(t, r, i, o, s) {
    return this.notImplemented();
  }
  async createPullRequest(t, r, i, o) {
    const s = `/projects/${this.projectId}/merge_requests`, l = await this.request(s, {
      method: "POST",
      body: JSON.stringify({
        title: t,
        description: r,
        source_branch: i,
        target_branch: o
      })
    });
    return this.mapMergeRequest(l);
  }
  async updatePullRequest(t, r) {
    return this.notImplemented();
  }
  async getPullRequest(t) {
    const r = `/projects/${this.projectId}/merge_requests/${t}`, i = await this.request(r);
    return this.mapMergeRequest(i);
  }
  async listPullRequests(t = "open") {
    const r = t === "open" ? "opened" : t, i = `/projects/${this.projectId}/merge_requests?state=${r}`;
    return (await this.request(i)).map((s) => this.mapMergeRequest(s));
  }
  async mergePullRequest(t, r = "merge") {
    const i = `/projects/${this.projectId}/merge_requests/${t}/merge`;
    await this.request(i, {
      method: "PUT"
    });
  }
  async createReviewComments(t, r, i) {
    return this.notImplemented();
  }
  async createIssue(t, r) {
    const i = `/projects/${this.projectId}/issues`, o = await this.request(i, {
      method: "POST",
      body: JSON.stringify({
        title: t,
        description: r
      })
    });
    return this.mapIssue(o);
  }
  async getIssue(t) {
    const r = `/projects/${this.projectId}/issues/${t}`, i = await this.request(r);
    return this.mapIssue(i);
  }
  async listIssues(t = "open") {
    const r = t === "open" ? "opened" : t, i = `/projects/${this.projectId}/issues?state=${r}`;
    return (await this.request(i)).map((s) => this.mapIssue(s));
  }
  async addPullRequestComment(t, r) {
    const i = `/projects/${this.projectId}/merge_requests/${t}/notes`;
    await this.request(i, {
      method: "POST",
      body: JSON.stringify({ body: r })
    });
  }
  async addIssueComment(t, r) {
    const i = `/projects/${this.projectId}/issues/${t}/notes`;
    await this.request(i, {
      method: "POST",
      body: JSON.stringify({ body: r })
    });
  }
  async getRepository() {
    const t = `/projects/${this.projectId}`, r = await this.request(t);
    return {
      name: r.name,
      description: r.description,
      url: r.web_url,
      defaultBranch: r.default_branch
    };
  }
  async hasWriteAccess() {
    return this.notImplemented();
  }
  mapMergeRequest(t) {
    let r;
    return t.state === "merged" ? r = "merged" : t.state === "opened" ? r = "open" : r = "closed", {
      number: t.iid,
      title: t.title,
      body: t.description,
      state: r,
      author: t.author.username,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      url: t.web_url
    };
  }
  mapIssue(t) {
    const r = t.state === "opened" ? "open" : "closed";
    return {
      number: t.iid,
      title: t.title,
      body: t.description,
      state: r,
      author: t.author.username,
      createdAt: t.created_at,
      url: t.web_url
    };
  }
  notImplemented() {
    throw new Error("GitLab provider git integration is not implemented yet");
  }
}
class BO extends Rl {
  constructor(e) {
    const t = (e.url || "https://gitea.com/api/v1").replace(/\/$/, ""), r = t.endsWith("/api/v1") ? t : `${t}/api/v1`;
    super({
      ...e,
      url: r
    });
  }
  getAuthHeader() {
    return `token ${this.config.token}`;
  }
  async getCurrentUser() {
    return this.notImplemented();
  }
  async createBranch(e, t) {
    return this.notImplemented();
  }
  async getFileContent(e, t) {
    return this.notImplemented();
  }
  async createOrUpdateFile(e, t, r, i, o) {
    return this.notImplemented();
  }
  async createPullRequest(e, t, r, i) {
    const o = `/repos/${this.config.owner}/${this.config.repo}/pulls`, s = await this.request(o, {
      method: "POST",
      body: JSON.stringify({
        title: e,
        body: t,
        head: r,
        base: i
      })
    });
    return this.mapPullRequest(s);
  }
  async updatePullRequest(e, t) {
    return this.notImplemented();
  }
  async getPullRequest(e) {
    const t = `/repos/${this.config.owner}/${this.config.repo}/pulls/${e}`, r = await this.request(t);
    return this.mapPullRequest(r);
  }
  async listPullRequests(e = "open") {
    const t = `/repos/${this.config.owner}/${this.config.repo}/pulls?state=${e}`;
    return (await this.request(t)).map((i) => this.mapPullRequest(i));
  }
  async mergePullRequest(e, t = "merge") {
    const r = `/repos/${this.config.owner}/${this.config.repo}/pulls/${e}/merge`;
    await this.request(r, {
      method: "POST",
      body: JSON.stringify({
        Do: t
      })
    });
  }
  async createReviewComments(e, t, r) {
    return this.notImplemented();
  }
  async createIssue(e, t) {
    const r = `/repos/${this.config.owner}/${this.config.repo}/issues`, i = await this.request(r, {
      method: "POST",
      body: JSON.stringify({
        title: e,
        body: t
      })
    });
    return this.mapIssue(i);
  }
  async getIssue(e) {
    const t = `/repos/${this.config.owner}/${this.config.repo}/issues/${e}`, r = await this.request(t);
    return this.mapIssue(r);
  }
  async listIssues(e = "open") {
    const t = `/repos/${this.config.owner}/${this.config.repo}/issues?state=${e}`;
    return (await this.request(t)).map((i) => this.mapIssue(i));
  }
  async addPullRequestComment(e, t) {
    const r = `/repos/${this.config.owner}/${this.config.repo}/issues/${e}/comments`;
    await this.request(r, {
      method: "POST",
      body: JSON.stringify({ body: t })
    });
  }
  async addIssueComment(e, t) {
    const r = `/repos/${this.config.owner}/${this.config.repo}/issues/${e}/comments`;
    await this.request(r, {
      method: "POST",
      body: JSON.stringify({ body: t })
    });
  }
  async getRepository() {
    const e = `/repos/${this.config.owner}/${this.config.repo}`, t = await this.request(e);
    return {
      name: t.name,
      description: t.description,
      url: t.html_url,
      defaultBranch: t.default_branch
    };
  }
  async hasWriteAccess() {
    return this.notImplemented();
  }
  mapPullRequest(e) {
    return {
      number: e.number,
      title: e.title,
      body: e.body,
      state: e.merged ? "merged" : e.state,
      author: e.user.login,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      url: e.html_url
    };
  }
  mapIssue(e) {
    return {
      number: e.number,
      title: e.title,
      body: e.body,
      state: e.state,
      author: e.user.login,
      createdAt: e.created_at,
      url: e.html_url
    };
  }
  notImplemented() {
    throw new Error("Gitea provider git integration is not implemented yet");
  }
}
class $O extends Rl {
  constructor() {
    super({
      url: "",
      owner: "local",
      repo: "local"
    });
  }
  getAuthHeader() {
  }
  getCurrentUser() {
    return Promise.resolve({ login: "local" });
  }
  createBranch() {
    return Promise.reject(
      new Error("Branches are not supported for local provider")
    );
  }
  getFileContent() {
    return Promise.reject(
      new Error("File access is not supported for local provider")
    );
  }
  createOrUpdateFile() {
    return Promise.reject(
      new Error("File writes are not supported for local provider")
    );
  }
  createPullRequest() {
    return Promise.reject(
      new Error("Pull requests not supported for local provider")
    );
  }
  getPullRequest() {
    return Promise.reject(
      new Error("Pull requests not supported for local provider")
    );
  }
  updatePullRequest() {
    return Promise.reject(
      new Error("Pull requests not supported for local provider")
    );
  }
  listPullRequests() {
    return Promise.resolve([]);
  }
  mergePullRequest() {
    return Promise.reject(
      new Error("Pull requests not supported for local provider")
    );
  }
  createReviewComments(e, t, r) {
    return Promise.resolve([]);
  }
  createIssue() {
    return Promise.reject(new Error("Issues not supported for local provider"));
  }
  getIssue() {
    return Promise.reject(new Error("Issues not supported for local provider"));
  }
  listIssues() {
    return Promise.resolve([]);
  }
  addPullRequestComment() {
    return Promise.reject(
      new Error("Comments not supported for local provider")
    );
  }
  addIssueComment() {
    return Promise.reject(
      new Error("Comments not supported for local provider")
    );
  }
  getRepository() {
    return Promise.resolve({
      name: "local",
      description: "Local repository",
      url: "",
      defaultBranch: "main"
    });
  }
  hasWriteAccess() {
    return Promise.resolve(!0);
  }
}
function zO(n) {
  const { provider: e, repository: t, auth: r, options: i } = n, o = Ra(i?.apiUrl) ? i?.apiUrl : void 0, s = Ra(i?.token) ? i?.token : void 0, l = {
    url: o,
    token: r?.mode === "pat" ? r.token : s,
    owner: t.owner,
    repo: t.name,
    auth: r
  };
  switch (e) {
    case "github":
      return new LO({
        ...l,
        url: l.url || "https://api.github.com"
      });
    case "gitlab":
      return new PO({
        ...l,
        url: l.url || "https://gitlab.com/api/v4",
        projectId: Ra(i?.projectId) ? i?.projectId : void 0
      });
    case "gitea":
    case "forgejo":
      return new BO({
        ...l,
        url: l.url || "https://gitea.com/api/v1"
      });
    case "local":
      return new $O();
    default:
      throw new Error(`Unknown provider type: ${e}`);
  }
}
function Ra(n) {
  return typeof n == "string" && n.trim().length > 0;
}
const FO = st("GitIntegration");
class _O {
  constructor(e, t) {
    this.provider = e, this.config = t;
  }
  getRepositoryConfig() {
    return this.config.repository;
  }
  getProvider() {
    return this.provider;
  }
  async submitReview(e) {
    throw FO.warn("Git integration submitReview is not implemented yet"), new Error("Git integration workflow is not implemented yet");
  }
}
const ns = st("GitModule");
class HO {
  constructor(e) {
    T(this, "resolution");
    T(this, "provider");
    T(this, "integration");
    if (this.resolution = NO(e), !this.resolution) {
      ns.info("Git integration disabled (no configuration provided)");
      return;
    }
    try {
      this.provider = zO(this.resolution.config), this.integration = new _O(
        this.provider,
        this.resolution.config
      );
      const t = this.resolution.config.repository;
      ns.debug(
        `Git integration configured for ${t.owner}/${t.name} (base: ${t.baseBranch})`
      );
    } catch (t) {
      ns.error("Failed to initialize git provider:", t);
    }
  }
  isEnabled() {
    return !!this.integration;
  }
  getConfig() {
    return this.resolution?.config ?? null;
  }
  getProvider() {
    return this.provider;
  }
  async submitReview(e) {
    if (!this.integration)
      throw new Error("Git integration is not configured");
    await this.integration.submitReview(e);
  }
  /**
   * Backwards compatible placeholder for the legacy `save` workflow.
   * The new git integration operates via pull requests instead of direct saves.
   */
  async save(e, t, r = "document.qmd") {
    return ns.warn("Direct git saves are not supported yet. Submit a review instead."), "";
  }
}
const Da = st("UserModule");
class qO {
  constructor(e = {}) {
    T(this, "currentUser", null);
    T(this, "config");
    T(this, "sessionTimer", null);
    this.config = {
      storageKey: e.storageKey || "quarto-review-user",
      sessionTimeout: e.sessionTimeout || 36e5
      // 1 hour default
    }, this.loadFromStorage();
  }
  /**
   * Authenticate a user
   */
  login(e) {
    this.currentUser = e, this.saveToStorage(), this.startSessionTimer();
  }
  /**
   * Log out the current user
   */
  logout() {
    this.currentUser = null, this.clearStorage(), this.clearSessionTimer();
  }
  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }
  /**
   * Check if user has a specific role
   */
  hasRole(e) {
    return this.currentUser?.role === e;
  }
  /**
   * Check if user can edit
   */
  canEdit() {
    return this.currentUser ? this.currentUser.role === "editor" || this.currentUser.role === "admin" : !1;
  }
  /**
   * Check if user can view
   */
  canView() {
    return this.isAuthenticated();
  }
  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.currentUser?.role === "admin";
  }
  /**
   * Check if user can comment
   */
  canComment() {
    return this.isAuthenticated();
  }
  /**
   * Check if user can delete comments
   */
  canDeleteComment(e) {
    return this.currentUser ? this.currentUser.role === "admin" ? !0 : this.currentUser.id === e : !1;
  }
  /**
   * Check if user can resolve comments
   */
  canResolveComment() {
    return this.canEdit();
  }
  /**
   * Check if user can push to git
   */
  canPush() {
    return this.canEdit();
  }
  /**
   * Check if user can merge pull requests
   */
  canMerge() {
    return this.isAdmin();
  }
  /**
   * Update user information
   */
  updateUser(e) {
    this.currentUser && (this.currentUser = {
      ...this.currentUser,
      ...e
    }, this.saveToStorage());
  }
  /**
   * Save user to storage
   */
  saveToStorage() {
    if (this.currentUser)
      try {
        localStorage.setItem(
          this.config.storageKey,
          JSON.stringify(this.currentUser)
        );
      } catch (e) {
        Da.error("Failed to save user to storage:", e);
      }
  }
  /**
   * Load user from storage
   */
  loadFromStorage() {
    try {
      const e = localStorage.getItem(this.config.storageKey);
      e && (this.currentUser = JSON.parse(e), this.startSessionTimer());
    } catch (e) {
      Da.error("Failed to load user from storage:", e);
    }
  }
  /**
   * Clear storage
   */
  clearStorage() {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (e) {
      Da.error("Failed to clear storage:", e);
    }
  }
  /**
   * Start session timeout timer
   */
  startSessionTimer() {
    this.clearSessionTimer(), this.sessionTimer = setTimeout(() => {
      this.logout();
    }, this.config.sessionTimeout);
  }
  /**
   * Clear session timer
   */
  clearSessionTimer() {
    this.sessionTimer && (clearTimeout(this.sessionTimer), this.sessionTimer = null);
  }
  /**
   * Refresh session (reset timer)
   */
  refreshSession() {
    this.isAuthenticated() && this.startSessionTimer();
  }
  /**
   * Create a guest user
   */
  static createGuest(e) {
    return {
      id: `guest-${Date.now()}`,
      name: e || "Guest",
      role: "viewer"
    };
  }
  /**
   * Create an editor user
   */
  static createEditor(e, t, r) {
    return {
      id: e,
      name: t,
      email: r,
      role: "editor"
    };
  }
  /**
   * Create an admin user
   */
  static createAdmin(e, t, r) {
    return {
      id: e,
      name: t,
      email: r,
      role: "admin"
    };
  }
  /**
   * Get permission summary for current user
   */
  getPermissions() {
    return {
      canView: this.canView(),
      canEdit: this.canEdit(),
      canComment: this.canComment(),
      canPush: this.canPush(),
      canMerge: this.canMerge(),
      isAdmin: this.isAdmin()
    };
  }
}
class jO {
  constructor(e = {}) {
    T(this, "changes");
    T(this, "markdown");
    T(this, "comments");
    T(this, "ui");
    T(this, "git");
    T(this, "user");
    // Public so it can be accessed for permissions
    T(this, "config");
    T(this, "autoSaveInterval");
    this.config = {
      autoSave: !1,
      autoSaveInterval: 3e5,
      // 5 minutes
      enableComments: !0,
      enableTranslation: !1,
      ...e
    }, this.config.debug && jn.setConfig(this.config.debug), this.changes = new Vb(), this.markdown = new ov(this.config.markdown), this.comments = new sv(), this.user = new qO(), this.git = new HO(this.config.git), this.ui = new EO({
      changes: this.changes,
      markdown: this.markdown,
      comments: this.comments,
      inlineEditing: !0
      // Enable inline editing mode by default
    }), this.initialize();
  }
  initialize() {
    this.changes.initializeFromDOM(), this.ui.attachEventListeners(), this.config.autoSave && this.setupAutoSave(), this.ui.refresh();
  }
  setupAutoSave() {
    this.autoSaveInterval = window.setInterval(() => {
      this.changes.hasUnsavedOperations() && this.save().catch((e) => {
        console.error("Auto-save failed:", e);
      });
    }, this.config.autoSaveInterval);
  }
  async save() {
    const e = this.changes.toCleanMarkdown();
    await this.git.save(e, this.changes.summarizeOperations()), this.changes.markAsSaved();
  }
  undo() {
    this.changes.undo(), this.ui.refresh();
  }
  redo() {
    this.changes.redo(), this.ui.refresh();
  }
  destroy() {
    this.autoSaveInterval && (clearInterval(this.autoSaveInterval), this.autoSaveInterval = void 0), this.ui.destroy();
  }
}
typeof window < "u" && window.addEventListener("DOMContentLoaded", () => {
  const n = document.querySelector("[data-review]");
  if (n) {
    const e = n.getAttribute("data-review-config"), t = e ? JSON.parse(e) : {};
    new jO(t);
  }
});
export {
  Vb as ChangesModule,
  sv as CommentsModule,
  HO as GitModule,
  ov as MarkdownModule,
  jO as QuartoReview,
  EO as UIModule,
  qO as UserModule,
  st as createModuleLogger,
  jn as debugLogger,
  jO as default,
  GA as printDebugHelp
};
//# sourceMappingURL=review.js.map
