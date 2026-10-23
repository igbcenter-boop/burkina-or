export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-sand py-8 print:bg-white print:py-0">{children}</div>;
}
