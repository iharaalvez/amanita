type TooltipProps = {
  content: string;
  children: React.ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <div className={`group/tt relative inline-flex ${className ?? ''}`}>
      {children}
      <div
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          bg-gray-900 text-white text-[11px] font-medium rounded px-2 py-1 whitespace-nowrap
          opacity-0 group-hover/tt:opacity-100
          transition-opacity duration-150 delay-300 group-hover/tt:delay-300
        "
      >
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
