# Calendario judicial

Calendario de plazos habiles judiciales con feriados y feria judicial. La app conserva el calculo local del vencimiento y sincroniza "Mis plazos" con una base de Notion mediante una API segura.

## Notion

Base creada: `Plazos judiciales`

Database ID:

```txt
2ec1937a98304b1db59f1815dd350cc6
```

Data source ID:

```txt
37fd9b37-bbe0-4e07-92cc-e940620be686
```

## Variables de entorno

Crear una integracion interna en Notion, compartirle la base `Plazos judiciales`, y configurar:

```txt
NOTION_TOKEN=secret_xxx
NOTION_PLAZOS_DATABASE_ID=2ec1937a98304b1db59f1815dd350cc6
```

## Desarrollo

```bash
npm install
npm run dev
```

## Migracion de plazos locales

La primera vez que se abre la nueva version desde una computadora que ya tenia plazos guardados en el navegador, la app intenta subir esos plazos a Notion automaticamente. Luego marca la migracion como realizada para evitar duplicados.
