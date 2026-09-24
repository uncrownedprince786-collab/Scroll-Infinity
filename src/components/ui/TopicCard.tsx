import Link from "next/link";
import type { Topic } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Card interactive className="topic-card has-stretched-link">
      <h3 className="topic-card__title">
        <Link href={`/topics/${topic.slug}`} className="stretched-link">
          {topic.name}
        </Link>
      </h3>
      <p className="topic-card__desc line-clamp-3">{topic.description}</p>
      <span className="topic-card__count">
        <strong>{formatNumber(topic.entityCount)}</strong>{" "}
        {topic.entityCount === 1 ? "entity" : "entities"}
      </span>
    </Card>
  );
}
