export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
        Carteira Pessoal
      </span>
    </header>
  );
}
