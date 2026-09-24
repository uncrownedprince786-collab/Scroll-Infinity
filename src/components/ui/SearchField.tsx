import { cx } from "@/components/ui/cx";
import { SearchIcon, ArrowRightIcon } from "@/components/ui/icons";

export interface SearchFieldProps {
  /** Accessible name for the input (always applied via aria-label). */
  label?: string;
  /** When false, also render a visible text label above the field. */
  hideLabel?: boolean;
  placeholder?: string;
  defaultValue?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
  className?: string;
  /** GET target; defaults to the site search route. */
  action?: string;
  /** Query param name; defaults to `q`. Works without JS. */
  name?: string;
}

/**
 * Progressive-enhancement search box: a plain GET form to `/search?q=…` that
 * works with no client JS. The accessible name is provided via `aria-label`, so
 * multiple instances never collide on ids.
 */
export function SearchField({
  label = "Search",
  hideLabel = true,
  placeholder = "Search Scroll Infinity…",
  defaultValue,
  size = "md",
  autoFocus,
  className,
  action = "/search",
  name = "q",
}: SearchFieldProps) {
  return (
    <form
      role="search"
      action={action}
      method="get"
      className={cx(
        "search-field",
        size === "sm" && "search-field--sm",
        size === "lg" && "search-field--lg",
        className,
      )}
    >
      {!hideLabel && (
        <span className="search-field__label" aria-hidden="true">
          {label}
        </span>
      )}
      <div className="search-field__wrap">
        <span className="search-field__icon">
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={label}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          className="search-field__input"
        />
        <button type="submit" className="search-field__submit" aria-label="Submit search">
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </form>
  );
}
