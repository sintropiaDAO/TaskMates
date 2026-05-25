# Gerar APK do TaskMates para `taskmates.app` (PWABuilder)

## 1. Antes de começar
- Domínio principal: **https://taskmates.app**
- Publicar a versão mais recente em Lovable (frontend → botão **Update** no Publish).
- Confirmar que `https://taskmates.app/manifest.webmanifest` carrega no navegador.

## 2. Gerar o pacote Android
1. Acesse **https://www.pwabuilder.com**
2. Cole `https://taskmates.app` e clique **Start**.
3. Aguarde a análise (Manifest / Service Worker / Security devem estar verdes).
4. Clique **Package For Stores → Android**.
5. Em **Android Package Options**:
   - **Package ID**: `app.taskmates.twa` (não mude depois — fica gravado no APK)
   - **App name**: `TaskMates`
   - **Short name**: `TaskMates`
   - **Host**: `taskmates.app`
   - **Start URL**: `/`
   - **Theme color / Background**: deixar como o manifest
   - **Display mode**: `standalone`
   - **Signing key**:
     - Primeira vez: escolha **"Create new"** e **GUARDE o ZIP** com o `.keystore` + senha. Sem isso, não dá pra publicar updates depois.
     - Atualizações: escolha **"Use mine"** e envie o `.keystore` da primeira geração.
6. Clique **Generate** → baixe o ZIP.

## 3. Publicar `assetlinks.json`
O ZIP contém `assetlinks.json` já com o SHA-256 correto.

1. Abra o `assetlinks.json` do ZIP.
2. Copie o valor de `sha256_cert_fingerprints`.
3. Cole em `public/.well-known/assetlinks.json` (substitua o placeholder).
4. Publique o frontend (Update no Lovable).
5. Verifique: `https://taskmates.app/.well-known/assetlinks.json` deve retornar JSON (não 404).
6. Teste oficial Google: https://developers.google.com/digital-asset-links/tools/generator

> ⚠️ Sem o `assetlinks.json` correto, o Chrome mostra barra de URL no app E o Play Protect avisa "App de risco".

## 4. Instalar / Distribuir
**Opção recomendada — Google Play Store:**
- Faça upload do `.aab` (também vem no ZIP) em https://play.google.com/console
- Custo único de US$ 25.
- Elimina 100% o aviso "App de risco".

**Opção alternativa — distribuição direta (APK):**
- Compartilhe o `.apk` do ZIP.
- Mesmo com `targetSdkVersion 35` + `assetlinks.json`, o Play Protect ainda pode mostrar aviso "App não verificado pelo Google" na primeira instalação (não é mais "App de risco bloqueado", o usuário consegue prosseguir).

## 5. Checklist final
- [ ] Frontend publicado em `taskmates.app`
- [ ] `https://taskmates.app/.well-known/assetlinks.json` retorna 200 com SHA-256 correto
- [ ] APK gerado com `targetSdkVersion 35` (PWABuilder atual já faz isso)
- [ ] Keystore guardado em local seguro (Google Drive privado, 1Password, etc.)
- [ ] (Recomendado) Publicado na Play Store
