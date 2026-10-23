# Layout ownership

Shared header, footer, route shells and responsive navigation currently live in src/app/App.tsx. Extract here when later screens require independent layouts; do not duplicate state or navigation.
