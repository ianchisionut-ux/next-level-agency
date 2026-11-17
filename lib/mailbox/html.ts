import "server-only";
import sanitizeHtml from "sanitize-html";

/** Keep email formatting and HTTPS images; never keep executable page content. */
export function sanitizeOutgoingHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "div", "span", "strong", "b", "em", "i", "u", "s", "strike", "blockquote", "pre", "code", "ul", "ol", "li", "h1", "h2", "h3", "h4", "hr", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "a", "img"],
    allowedAttributes: {
      "*": ["style", "title"], a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"],
      table: ["width", "cellpadding", "cellspacing", "border", "role"], td: ["colspan", "rowspan", "width", "align", "valign"], th: ["colspan", "rowspan", "width", "align", "valign"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"], a: ["https", "http", "mailto", "tel"] },
    allowProtocolRelative: false,
    allowedStyles: { "*": {
      color: [/^#[0-9a-f]{3,8}$/i, /^[a-z]{1,20}$/i, /^rgba?\([\d\s.,%]+\)$/i],
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^[a-z]{1,20}$/i, /^rgba?\([\d\s.,%]+\)$/i],
      "font-family": [/^[a-z0-9\s,'"-]{1,150}$/i], "font-size": [/^\d{1,3}(?:\.\d{1,2})?(px|pt|em|rem|%)$/],
      "font-weight": [/^(normal|bold|[1-9]00)$/], "font-style": [/^(normal|italic|oblique)$/],
      "text-align": [/^(left|right|center|justify)$/], "text-decoration": [/^(none|underline|line-through)$/],
      "line-height": [/^\d{1,3}(?:\.\d{1,2})?(px|pt|em|rem|%)?$/],
      margin: [/^\d{1,4}(px|pt|em|rem|%)?(\s+\d{1,4}(px|pt|em|rem|%)?){0,3}$/],
      padding: [/^\d{1,4}(px|pt|em|rem|%)?(\s+\d{1,4}(px|pt|em|rem|%)?){0,3}$/],
      width: [/^\d{1,4}(px|%)$/], "max-width": [/^\d{1,4}(px|%)$/], height: [/^\d{1,4}px$/],
      "border-collapse": [/^(collapse|separate)$/], "vertical-align": [/^(top|middle|bottom|baseline)$/],
    } },
    transformTags: { a: (_tag, attributes) => ({ tagName: "a", attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" } }) },
    exclusiveFilter: frame => frame.tag === "img" && !frame.attribs.src,
  });
}
