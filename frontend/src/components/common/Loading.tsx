export default function Loading({ text = '분석 중...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#64748B] text-sm">{text}</p>
    </div>
  )
}
