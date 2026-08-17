import { useEffect, useState } from 'react';

function consultar(query) {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

export default function useMediaQuery(query) {
  const [corresponde, setCorresponde] = useState(() => consultar(query));

  useEffect(() => {
    const media = window.matchMedia(query);
    const atualizar = (event) => setCorresponde(event.matches);

    setCorresponde(media.matches);
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, [query]);

  return corresponde;
}
