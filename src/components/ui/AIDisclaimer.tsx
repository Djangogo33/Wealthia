import { useTranslation } from "@/lib/strings";

export function AIDisclaimer() {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 p-3 rounded-xl border border-[#C8B99A]/20 bg-[#C8B99A]/5 text-xs text-[#8A8A7A]">
      <span aria-hidden>⚠️</span>
      <span>{t("advisor.disclaimer")}</span>
    </div>
  );
}
