var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => OpenImagesPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var OpenImagesPlugin = class extends import_obsidian.Plugin {
  onload() {
    this.registerDomEvent(document, "click", (evt) => {
      var _a, _b;
      if (!evt.ctrlKey) return;
      const target = evt.target;
      if (!(target instanceof HTMLImageElement)) return;
      const embed = target.closest(".internal-embed");
      if (!embed) return;
      const linkSrc = embed.getAttribute("src");
      if (!linkSrc) return;
      evt.preventDefault();
      evt.stopPropagation();
      const sourcePath = (_b = (_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path) != null ? _b : "";
      const file = this.app.metadataCache.getFirstLinkpathDest(linkSrc, sourcePath);
      if (file instanceof import_obsidian.TFile) {
        const leaf = this.app.workspace.getLeaf("tab");
        leaf.openFile(file);
      }
    });
  }
  onunload() {
  }
};
