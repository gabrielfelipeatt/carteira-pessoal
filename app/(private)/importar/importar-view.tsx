"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/finance/states";
import { AccountSelect } from "@/components/finance/account-select";
import { CreditCardSelect } from "@/components/finance/credit-card-select";
import { MoneyText } from "@/components/finance/money-text";
import { commitImport, previewImport } from "@/lib/actions/import";
import {
  findSheet,
  normalizeText,
  parseSheetRows,
  type ImportInput,
  type ImportItemStatus,
  type ImportPreview,
  type ImportPreviewItem,
  type ImportRow,
  type ImportSheetName,
} from "@/lib/finance/import";
import type { accounts as accountsTable, creditCards as creditCardsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;
type CreditCard = typeof creditCardsTable.$inferSelect & { availableCents: number };

type Sheets = Record<ImportSheetName, ImportRow[]>;

const sheetLabels: Record<ImportSheetName, string> = {
  itau: "Itaú — conta",
  nubank: "Nubank — cartão de crédito",
  flash: "Flash — cartão alimentação",
};

const statusLabels: Record<ImportItemStatus, string> = {
  new: "Nova",
  duplicate: "Possível duplicata",
  skip: "Ignorada",
  review: "Precisa de revisão",
};

const statusClass: Record<ImportItemStatus, string> = {
  new: "text-income",
  duplicate: "text-muted-foreground",
  skip: "text-muted-foreground",
  review: "text-destructive",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function ImportarView({
  accounts,
  creditCards,
}: {
  accounts: Account[];
  creditCards: CreditCard[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Sheets | null>(null);
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const [itauAccountId, setItauAccountId] = useState<string | undefined>(
    () => accounts.find((a) => a.isActive && normalizeText(a.name).includes("itau"))?.id,
  );
  const [creditCardId, setCreditCardId] = useState<string | undefined>(
    () =>
      creditCards.find(
        (c) => c.status === "active" && normalizeText(c.nickname).includes("nubank"),
      )?.id,
  );
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);
  const [analyzing, startAnalyze] = useTransition();
  const [importing, startImport] = useTransition();

  function reset() {
    setSheets(null);
    setPreview(null);
    setSelected(new Set());
    setReadErrors([]);
    setFileName(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleFile(file: File) {
    setReading(true);
    setPreview(null);
    setSelected(new Set());
    setReadErrors([]);
    setFileName(file.name);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const workbook = await readXlsxFile(file);

      const next: Sheets = { itau: [], nubank: [], flash: [] };
      const errors: string[] = [];
      for (const name of ["itau", "nubank", "flash"] as const) {
        const sheet = findSheet(workbook, name);
        if (!sheet) continue;
        const parsed = parseSheetRows(sheet.data as unknown[][]);
        next[name] = parsed.rows;
        errors.push(...parsed.errors.map((message) => `${sheetLabels[name]}: ${message}`));
      }

      if (next.itau.length + next.nubank.length + next.flash.length === 0) {
        errors.push('Nenhuma aba reconhecida. Use abas chamadas "itau", "nubank" e/ou "flash".');
        setSheets(null);
      } else {
        setSheets(next);
      }
      setReadErrors(errors);
    } catch {
      setSheets(null);
      setReadErrors(["Não foi possível ler o arquivo. Confirme que é uma planilha .xlsx."]);
    } finally {
      setReading(false);
    }
  }

  function buildInput(): ImportInput | null {
    if (!sheets) return null;
    return {
      itauAccountId,
      creditCardId,
      itau: sheets.itau,
      nubank: sheets.nubank,
      flash: sheets.flash,
    };
  }

  function handleAnalyze() {
    const input = buildInput();
    if (!input) return;
    if (input.itau.length > 0 && !itauAccountId) {
      toast.error("Selecione a conta da aba Itaú.");
      return;
    }
    if (input.nubank.length > 0 && !creditCardId) {
      toast.error("Selecione o cartão da aba Nubank.");
      return;
    }
    startAnalyze(async () => {
      try {
        const result = await previewImport(input);
        setPreview(result);
        setSelected(new Set(result.items.filter((i) => i.status === "new").map((i) => i.key)));
      } catch {
        toast.error("Não foi possível analisar a planilha. Confira a conta e o cartão escolhidos.");
      }
    });
  }

  function handleImport() {
    const input = buildInput();
    if (!input || !preview) return;
    startImport(async () => {
      try {
        const result = await commitImport({ ...input, selectedKeys: [...selected] });
        if (result.imported > 0) {
          toast.success(
            `${result.imported} lançamento${result.imported === 1 ? "" : "s"} importado${result.imported === 1 ? "" : "s"}.`,
          );
        }
        if (result.createdAccounts.length > 0) {
          toast.info(`Conta criada: ${result.createdAccounts.join(", ")}.`);
        }
        if (result.errors.length > 0) {
          toast.error(
            `${result.errors.length} linha${result.errors.length === 1 ? "" : "s"} não ${result.errors.length === 1 ? "pôde" : "puderam"} ser importada${result.errors.length === 1 ? "" : "s"}: ${result.errors[0].message}`,
          );
        }
        reset();
        router.refresh();
      } catch {
        toast.error("Erro ao importar. Nada foi perdido — analise a planilha e tente de novo.");
      }
    });
  }

  function toggle(key: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const counts = preview
    ? {
        new: preview.items.filter((i) => i.status === "new").length,
        duplicate: preview.items.filter((i) => i.status === "duplicate").length,
        review: preview.items.filter((i) => i.status === "review").length,
        skip: preview.items.filter((i) => i.status === "skip").length,
      }
    : null;

  const hasAccounts = accounts.some((a) => a.isActive);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Importar planilha</h1>
        <p className="text-sm text-muted-foreground">
          Traga lançamentos de uma planilha .xlsx com as abas “itau”, “nubank” e/ou “flash”.
          Nada é gravado antes de você revisar.
        </p>
      </div>

      {!hasAccounts ? (
        <EmptyState
          icon={<FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />}
          title="Cadastre uma conta primeiro"
          description="A importação precisa de pelo menos uma conta para receber os lançamentos."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4">
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              className="sr-only"
              id="import-file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-11 gap-2"
                disabled={reading}
                onClick={() => fileInput.current?.click()}
              >
                {reading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <FileSpreadsheet className="size-4" aria-hidden />
                )}
                {fileName ? "Trocar arquivo" : "Escolher arquivo .xlsx"}
              </Button>
              {fileName ? (
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {fileName}
                </span>
              ) : null}
            </div>

            {readErrors.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-destructive" role="alert">
                {readErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}

            {sheets ? (
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {(Object.keys(sheets) as ImportSheetName[])
                  .filter((name) => sheets[name].length > 0)
                  .map((name) => (
                    <li key={name}>
                      {sheetLabels[name]}: {sheets[name].length} linha
                      {sheets[name].length === 1 ? "" : "s"}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>

          {sheets ? (
            <div className="flex flex-col gap-3">
              {sheets.itau.length > 0 ? (
                <AccountSelect
                  id="import-itau-account"
                  label="Conta que recebe a aba Itaú"
                  accounts={accounts}
                  value={itauAccountId}
                  onChange={(value) => {
                    setItauAccountId(value);
                    setPreview(null);
                  }}
                />
              ) : null}
              {sheets.nubank.length > 0 ? (
                <CreditCardSelect
                  id="import-nubank-card"
                  label="Cartão que recebe a aba Nubank"
                  creditCards={creditCards}
                  value={creditCardId}
                  onChange={(value) => {
                    setCreditCardId(value);
                    setPreview(null);
                  }}
                />
              ) : null}
              <Button className="h-11" disabled={analyzing} onClick={handleAnalyze}>
                {analyzing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Analisar planilha
              </Button>
            </div>
          ) : null}
        </>
      )}

      {preview && counts ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <p className="text-foreground">
              <strong>{counts.new}</strong> nova{counts.new === 1 ? "" : "s"} ·{" "}
              <strong>{counts.duplicate}</strong> possível
              {counts.duplicate === 1 ? "" : "is"} duplicata{counts.duplicate === 1 ? "" : "s"} ·{" "}
              <strong>{counts.review}</strong> para revisar · <strong>{counts.skip}</strong>{" "}
              ignorada{counts.skip === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Duplicata = já existe lançamento com a mesma data e valor. Ficam desmarcadas — marque
              só se for um lançamento realmente novo.
            </p>
            {preview.newAccounts.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Serão criadas as contas: {preview.newAccounts.join(", ")}.
              </p>
            ) : null}
          </div>

          {(["itau", "nubank", "flash"] as const).map((name) => {
            const rows = preview.items.filter((item) => item.sheet === name);
            if (rows.length === 0) return null;
            return (
              <section key={name} className="flex flex-col gap-2">
                <h2 className="font-heading text-sm font-semibold text-muted-foreground">
                  {sheetLabels[name]}
                </h2>
                <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {rows.map((item) => (
                    <PreviewRow
                      key={item.key}
                      item={item}
                      checked={selected.has(item.key)}
                      onChange={(checked) => toggle(item.key, checked)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          <div className="sticky bottom-16 flex flex-col gap-2 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur lg:bottom-4">
            <Button
              className="h-11"
              disabled={importing || selected.size === 0}
              onClick={handleImport}
            >
              {importing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Importar {selected.size} lançamento{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewRow({
  item,
  checked,
  onChange,
}: {
  item: ImportPreviewItem;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const selectable = item.status === "new" || item.status === "duplicate";
  const signed = item.direction === "outflow" ? -item.cents : item.cents;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Checkbox
        className="mt-1"
        checked={checked}
        disabled={!selectable}
        aria-label={`Importar ${item.desc}`}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.desc}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(item.date)} · {item.target}
          {item.category ? ` · ${item.category}` : ""}
        </p>
        <p className={`text-xs ${statusClass[item.status]}`}>
          {statusLabels[item.status]}
          {item.note ? ` — ${item.note}` : ""}
        </p>
      </div>
      <MoneyText
        cents={signed}
        tone={item.kind === "cofrinho" || item.kind === "card_payment" ? "neutral" : "auto"}
        className="shrink-0 text-sm"
      />
    </li>
  );
}
