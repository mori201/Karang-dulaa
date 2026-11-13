import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLexicon, splitByPageMarkers, detectSections, parseCsvRows } from "../src/lib/import/parse.ts";

// Court extrait (citation) de Creissels 2012, p. 5-6, tel que restitué par l'extraction PDF.
const SAMPLE = `Denis Creissels, Matériaux pour un dictionnaire mandinka (janvier 2012), p. 5/274
a : lui, elle, ça (forme non emphatique)

a táatá mintoo ? : où est-il parti ? í yé a jé bǎŋ ? : est-ce que tu l’as vu ? a lá musôo mâŋ wúlúu fóloo : sa femme n’a pas encore accouché áadá, láadá : coutume, tradition

áadóolu ñánta mutalá le : les coutumes doivent être maintenues àbáríká : merci àbíyóŋ : avion àdèréesí, dèréesí : adresse
Denis Creissels, Matériaux pour un dictionnaire mandinka (janvier 2012), p. 6/274
àlàhádí, làhádí : dimanche Álâ lá sùwô : mante religieuse`;

test("découpage par marqueurs de page", () => {
  const pages = splitByPageMarkers(SAMPLE);
  assert.equal(pages[0].page, "5");
  assert.equal(pages.at(-1)!.page, "6");
});

test("extraction des entrées et des exemples sans altérer l'orthographe", () => {
  const items = parseLexicon(splitByPageMarkers(SAMPLE));
  const heads = items.filter((i) => i.headword).map((i) => i.headword);
  for (const h of ["áadá", "àbáríká", "àbíyóŋ", "àdèréesí", "àlàhádí"]) assert.ok(heads.includes(h), `entrée ${h} manquante (obtenu : ${heads.join(", ")})`);
  const merci = items.find((i) => i.headword === "àbáríká")!;
  assert.equal(merci.translation_fr, "merci");
  assert.equal(merci.page, "5");
  const adda = items.find((i) => i.headword === "áadá")!;
  assert.equal(adda.translation_fr, "coutume, tradition");
  assert.ok(adda.raw_text.includes("láadá"), "la variante reste visible dans le texte source");
  assert.equal(adda.examples[0]?.mandinka, "áadóolu ñánta mutalá le");
  assert.equal(items.find((i) => i.headword === "àlàhádí")!.page, "6");
  // aucune normalisation destructrice : les caractères mandinka sont conservés
  assert.ok(items.some((i) => i.raw_text.includes("ŋ")));
});

test("détection de sections", () => {
  const s = detectSections([{ page: "28", text: "I. SPECIFICITES PHONOLOGIQUES\ntexte ordinaire ici\n1.1 Les symboles de l'alphabet" }]);
  assert.equal(s.length, 2);
});

test("CSV", () => {
  const c = parseCsvRows([{ mot: "àbáríká", traduction: "merci", page: "5" }, { mot: "", traduction: "" }]);
  assert.equal(c.length, 1);
  assert.equal(c[0].confidence, 0.9);
});
