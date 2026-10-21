import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const { creator, repositoryUrl, name, description } = siteConfig;

  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <Container className="grid gap-6 py-10 text-sm text-muted sm:grid-cols-2">
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="mt-1 max-w-sm">{description}</p>
        </div>
        <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
          <p>
            Created by{" "}
            {creator.url ? (
              <a href={creator.url} className="font-medium text-foreground hover:text-accent">
                {creator.name}
              </a>
            ) : (
              <span className="font-medium text-foreground">{creator.name}</span>
            )}
          </p>
          <p>
            Community-built and open source
            {repositoryUrl && (
              <>
                {" · "}
                <a href={repositoryUrl} className="hover:text-accent">
                  Source code
                </a>
              </>
            )}
          </p>
          <p className="text-xs">Map data © OpenStreetMap contributors</p>
        </div>
      </Container>
    </footer>
  );
}
