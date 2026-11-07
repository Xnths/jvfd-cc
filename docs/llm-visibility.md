# Visibility in search engines and LLMs

Goal: when someone asks an LLM about psychotherapy or avaliação neuropsicológica, João's site can be found and cited. No change guarantees that an LLM will name him. This file holds what only a person with the logins can do, and how to measure progress.

## Baseline (2026-11-07)

Before these changes, the crawl setup already worked (AI bots get 200, robots.txt, llms.txt, sitemap, server-rendered HTML). Discovery was the problem:

- The search tool used by Claude Code did not return the site for "avaliação neuropsicológica São Paulo Vila Madalena psicólogo", "onde fazer avaliação neuropsicológica adulto em São Paulo", "psicólogo análise do comportamento psicoterapia Vila Madalena São Paulo", or even "psicologojoaofernandes.com". Doctoralia dominated the local results.
- `site:` queries: DuckDuckGo showed 3 pages plus the home page (/autoconhecimento, /plantao, one post), Brave showed the home page. The Bing result was unusable (it returned an unrelated site).

Which index each LLM uses is mostly reported by secondary sources, and part of it is disputed: Gemini uses Google; Claude reportedly uses Brave; Perplexity uses its own crawler plus others; ChatGPT is disputed between Bing and OpenAI's own index. So cover all of them.

## Checklist (needs your or João's logins)

Probably the biggest factor for local recommendations. Roughly in order of effort against return:

- [ ] **Bing Webmaster Tools** (not set up yet): create it at bing.com/webmasters and use "Import from Google Search Console". Bing feeds Copilot and DuckDuckGo, and possibly ChatGPT.
- [ ] **Google Search Console**: resubmit `/sitemap.xml`. Use URL Inspection → Request indexing for `/avaliacao-neuropsicologica`, `/psicoterapia`, `/perguntas` and `/glossario`.
- [ ] **Google Business Profile**: add "Avaliação neuropsicológica" as a service. Keep the name, address, phone and site link identical to the site. Add the site link if missing.
- [ ] **Doctoralia**: add the avaliação neuropsicológica service and the site link. Don't use price as promotion (CFP Res. 010/2005, Art. 20).
- [ ] **OneLiv** (its page does not link to the site today), **Escavador**, **Lattes**, **LinkedIn**, **Instagram**: add the site link.
- [ ] **Brave Search**: check for a URL submission option at search.brave.com. It has its own index and shows only the home page today.
- [ ] Send the Doctoralia and Escavador profile URLs to add them to `sameAs` in `src/content/clinic.ts`.

**Reviews:** this checklist does not recommend asking patients for reviews. It raises confidentiality and CFP concerns, so João should decide it, with the CRP if needed.

**Same facts everywhere:** LLMs compare sources. Use the same full name (João Vitor Fernandes Domingues), CRP 06/157908, address (Rua Harmonia, 1323, Sumarezinho, Vila Madalena) and "pós-graduação em Neuropsicologia pelo Hospital Israelita Albert Einstein". Never "neuropsicólogo" or "especialista": those are titles he has not registered.

## Measuring

Repeat at about 4 and 8 weeks after the deploy (around 2026-12-05 and 2027-01-02). Run these in ChatGPT, Claude, Gemini and Perplexity with web search on, and note whether the site is cited and whether the facts are right:

1. Onde fazer avaliação neuropsicológica na Vila Madalena?
2. Onde fazer avaliação neuropsicológica para adultos em São Paulo?
3. Quanto tempo dura uma avaliação neuropsicológica?
4. Quem pode fazer avaliação neuropsicológica no Brasil?
5. Psicólogo em Análise do Comportamento na Vila Madalena
6. Psicoterapia online com psicólogo em Análise do Comportamento
7. Terapia online funciona?
8. O que é terapia em Análise do Comportamento?

Questions 3, 4, 7 and 8 test citation as a source, and should move first. Questions 1, 2, 5 and 6 test recommendation, and depend more on the checklist above.

AI crawler visits, on the Pi:

```bash
docker logs --since 168h clinic-nginx 2>&1 \
  | grep -oE 'GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|bingbot|Googlebot|Applebot' \
  | sort | uniq -c | sort -rn
```

`*-User` agents fetch a page because a person asked something right then, so those hits matter the most.

## Adding content

Glossary terms and Q&As are in Postgres (`glossary_terms`, `faq_questions`), seeded by `backend/migrations/0016_knowledge_base.sql`. They have no clinician review, so `reviewed_by_profile_id` stays NULL and the pages show no "Revisado por" line. Never set a reviewer who did not read the text. `backend/internal/api/knowledge_base_test.go` runs seeded content through the CFP copy lint and checks its internal links.
