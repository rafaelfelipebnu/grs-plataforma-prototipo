import { Button } from '@/components/ui';
import { useContextNavigation } from './contextNavigation';

/** Oferece retorno ao contexto anterior quando a página foi aberta a partir de outro contexto. */
export function ReturnBar() {
  const { stack, goBack } = useContextNavigation();
  const previous = stack[stack.length - 1];
  if (!previous) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <Button variant="link" icon="arrow-left" onClick={goBack} style={{ paddingLeft: 0 }}>
        Voltar para {previous.label}
      </Button>
    </div>
  );
}
