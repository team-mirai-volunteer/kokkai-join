interface SummaryCardProps {
  title?: string;
  content: string;
  className?: string;
}

export default function SummaryCard({
  title = "要約",
  content,
  className = "",
}: SummaryCardProps) {
  return (
    <div
      className={`bg-white border-l-4 border-blue-500 shadow-sm rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">📄</span>
          </div>
        </div>
        <div className="ml-4">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}
