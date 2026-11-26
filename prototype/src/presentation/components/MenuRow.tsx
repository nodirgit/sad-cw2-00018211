/** One row of a phone-style menu: icon, title, detail, chevron. */
export function MenuRow({ icon, title, detail, onClick }: { icon: string; title: string; detail: string; onClick: () => void }) {
  return (
    <button className="menu-row" onClick={onClick}>
      <span className="ico" aria-hidden>
        {icon}
      </span>
      <span className="txt">
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      <span className="chev" aria-hidden>
        ›
      </span>
    </button>
  );
}
