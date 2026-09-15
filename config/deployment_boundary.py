"""Validação pura da fronteira app/API em domínio próprio comum."""

import re
from urllib.parse import urlsplit


DOMINIO_RE = re.compile(
    r'^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
)


def _origem_https(url: str, nome: str) -> tuple[str, str]:
    partes = urlsplit(url)
    try:
        porta = partes.port
    except ValueError as exc:
        raise ValueError(f'{nome} deve ser uma origem HTTPS sem caminho.') from exc
    if (
        partes.scheme != 'https'
        or not partes.hostname
        or partes.username
        or partes.password
        or partes.path not in {'', '/'}
        or partes.query
        or partes.fragment
        or porta not in {None, 443}
    ):
        raise ValueError(f'{nome} deve ser uma origem HTTPS sem caminho.')
    host = partes.hostname.lower().rstrip('.')
    return f'https://{host}', host


def _pertence_ao_site(host: str, site: str) -> bool:
    return host == site or host.endswith(f'.{site}')


def validar_fronteira_compartilhada(
    *,
    site_domain: str,
    frontend_url: str,
    backend_url: str,
    allowed_hosts: list[str],
    cors_origins: list[str],
    csrf_origins: list[str],
    cookie_samesites: list[str],
) -> None:
    site = site_domain.strip().lower().strip('.')
    if not DOMINIO_RE.fullmatch(site):
        raise ValueError('PUBLIC_SITE_DOMAIN deve conter apenas o domínio registrável.')

    frontend_origin, frontend_host = _origem_https(frontend_url, 'FRONTEND_URL')
    _backend_origin, backend_host = _origem_https(backend_url, 'BACKEND_URL')
    if frontend_host == backend_host:
        raise ValueError('Frontend e API devem usar hosts distintos na topologia aprovada.')
    for nome, host in [('FRONTEND_URL', frontend_host), ('BACKEND_URL', backend_host)]:
        if not _pertence_ao_site(host, site):
            raise ValueError(f'{nome} precisa pertencer a {site}.')

    hosts_explicitos = {host.strip().lower().rstrip('.') for host in allowed_hosts}
    if not hosts_explicitos or '*' in hosts_explicitos or any(
        host.startswith('.') for host in hosts_explicitos
    ):
        raise ValueError('ALLOWED_HOSTS deve conter apenas hosts explícitos.')
    if backend_host not in hosts_explicitos:
        raise ValueError('ALLOWED_HOSTS precisa incluir o host público de BACKEND_URL.')

    for nome, origens in [
        ('CORS_ALLOWED_ORIGINS', cors_origins),
        ('CSRF_TRUSTED_ORIGINS', csrf_origins),
    ]:
        if not origens:
            raise ValueError(f'{nome} não pode ficar vazio.')
        origens_normalizadas = set()
        for origem in origens:
            origem_normalizada, host = _origem_https(origem, nome)
            origens_normalizadas.add(origem_normalizada)
            if not _pertence_ao_site(host, site):
                raise ValueError(f'{nome} contém origem fora de {site}: {origem}')
        if frontend_origin not in origens_normalizadas:
            raise ValueError(f'{nome} precisa incluir FRONTEND_URL.')

    for valor in cookie_samesites:
        if valor.lower() not in {'lax', 'strict'}:
            raise ValueError('No domínio compartilhado, cookies devem usar SameSite=Lax ou Strict.')
