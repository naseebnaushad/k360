import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <main>
      <Container className="py-20">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-muted">The page you are looking for doesn&apos;t exist.</p>
      </Container>
    </main>
  );
}
