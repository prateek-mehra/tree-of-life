import { Star } from "lucide-react";

type FavoriteToggleProps = {
  active: boolean;
  onToggle: () => void;
};

export function FavoriteToggle({ active, onToggle }: FavoriteToggleProps) {
  return (
    <button
      className={`favorite-toggle ${active ? "is-active" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={active ? "Remove favorite" : "Mark favorite"}
    >
      <Star size={15} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
