interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

export const SectionHeader = ({ icon, title }: SectionHeaderProps) => (
  <div className="flex items-center gap-2 border-b pb-2 mb-4">
    <div className="text-primary">{icon}</div>
    <h3 className="text-base font-bold uppercase tracking-wider text-slate-500">{title}</h3>
  </div>
);
