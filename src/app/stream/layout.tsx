export default function StreamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-[#08090f] text-[#e0ddf5]">
      {children}
    </div>
  );
}
