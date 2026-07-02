import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/strings";

export function LegalFooter({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const linkCls = "hover:text-[var(--gold)] hover:underline";
  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-6 text-center text-[11px] ${className}`}
      style={{ color: "#8A8A7A" }}
    >
      <span>{t("legal.footer")}</span>
      <span>·</span>
      <Link to="/legal/mentions-legales" className={linkCls}>{t("legal.mentions")}</Link>
      <span>·</span>
      <Link to="/legal/cgu" className={linkCls}>{t("legal.cgu")}</Link>
      <span>·</span>
      <Link to="/legal/confidentialite" className={linkCls}>{t("legal.privacy")}</Link>
      <span>·</span>
      <Link to="/legal/cgv" className={linkCls}>{t("legal.cgv")}</Link>
    </footer>
  );
}
