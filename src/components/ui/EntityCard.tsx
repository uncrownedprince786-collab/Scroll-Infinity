import Link from "next/link";
import Image from "next/image";
import type { EntitySummary } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/ui/Badge";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { ImageIcon } from "@/components/ui/icons";

/** Entity summary card. The whole card is clickable via the stretched link; the
 *  topic tags stay independently clickable (they sit above the overlay). */
export function EntityCard({ entity }: { entity: EntitySummary }) {
  const img = entity.primaryImage;
  return (
    <Card interactive className="entity-card has-stretched-link">
      <div className="entity-card__media">
        {img ? (
          <Image
            src={img.url}
            alt={img.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1120px) 50vw, 360px"
            className="entity-card__img"
          />
        ) : (
          <span className="entity-card__placeholder">
            <ImageIcon size={40} />
          </span>
        )}
      </div>
      <div className="entity-card__body">
        <div className="entity-card__topline">
          <h3 className="entity-card__title">
            <Link
              href={`/entity/${entity.slug}`}
              className="entity-card__link stretched-link"
            >
              {entity.name}
            </Link>
          </h3>
        </div>
        <p className="entity-card__desc line-clamp-2">{entity.description}</p>
        {entity.topicSlugs.length > 0 && (
          <div className="entity-card__tags">
            {entity.topicSlugs.slice(0, 3).map((slug) => (
              <Link key={slug} href={`/topics/${slug}`} className="tag">
                {slug}
              </Link>
            ))}
          </div>
        )}
        <div className="entity-card__meta">
          <VerificationBadge state={entity.verification} />
          <FreshnessBadge iso={entity.updatedAt} />
        </div>
      </div>
    </Card>
  );
}
