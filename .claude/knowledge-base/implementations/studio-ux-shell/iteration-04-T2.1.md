# Iteração 4 — T2.1 (shell) — 2026-07-14

RED (3 files) → GREEN → REFACTOR (stderr fixes do SEPA) → WIRING → COMMIT.

## Decisões (SEPA pre-RED + pre-COMMIT GO-condicional, pendências resolvidas)

1. Sidebar do @usetheo/ui wire manual (navigate/active) — sem integração router nativa.
2. SEM lucide-react (veto SEPA — fora do § Dependencies); breadcrumb hand-rolled
   (nav aria-label; @usetheo/ui não tem Breadcrumb).
3. buildRoutes(extraChildren) — seam p/ injetar rota de crash SÓ no teste (EC-2);
   spy de console.error escopado (React ecoa erro capturado).
4. bootstrap: parseStudioConfig pura (EC-8) + auto-boot guardado por !import.meta.env.TEST;
   call-site com .catch(()=>{}) documentado (loud único — startup-error já renderizou).
5. Stderr zerado per SEPA: element:null na index redirect; hydrateFallbackElement real;
   mount() em act() no boot test.
6. Dívidas quitadas: useDataSource sem provider (mensagem contextual) ✓;
   bootstrap sem #root ✓ (integration). Restante: branch fallback do route-error (T2.2).
7. Suite 44/44; coverage src/app 100%, bootstrap 92%; wiring
   Shell/buildRoutes/mount/bootstrap/parseStudioConfig/renderStartupError a+b PASS.
