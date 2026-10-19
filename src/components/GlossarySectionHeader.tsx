export default function GlossarySectionHeader({ id, label, children }: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <header className="section-header">
      <h2 id={id} className="section-title">
        <span className="section-title-en">{label}</span>
        {children}
      </h2>
    </header>
  );
}
