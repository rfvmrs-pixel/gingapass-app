# Histórico de ajustes — GingaPass (index.html)

Este arquivo resume tudo que já foi corrigido/adicionado no app até agora.
Se abrir uma conversa nova pra mexer no HTML de novo, **suba este arquivo
junto com o index.html mais recente** e me diga "continua daqui" — eu leio
isso e já sei o que já foi feito, sem precisar re-explicar tudo.

---

## 1. Cor do app (Perfil > Aparência)
- Havia DOIS sistemas de cor conflitantes (um antigo com seletor de cor, um
  novo com bolinhas). O antigo sobrescrevia o novo a cada login.
- **Removido o sistema antigo por completo.** Só sobrou o das bolinhas
  (`renderTemaSwatches`, `escolherTema`, `aplicarCoresTema`), salvo em
  `gingapass_aparencia_<role>:<user>`.

## 2. Grupos oficiais (nome + foto + mestre(s) representantes)
- Só a conta **matriz (admin)** cadastra grupos, em **Perfil/Matriz →
  "Cadastrar grupos"** (`cadastrarGrupoOficial`, `criarGrupoParceiro`).
  Aceita foto/logo do grupo e vários mestres (separados por vírgula).
- Nova aba **"Grupos"** no menu ☰ (`gruposOficiaisTela` /
  `renderGruposOficiaisTela`) — visível pra qualquer conta ver a lista; só
  matriz pode adicionar mais mestres a um grupo existente
  (`adicionarMestreAoGrupo`) ou remover (`removerGrupoParceiro`).
- Dado fica em `localStorage['gingapass_grupos_parceiros']`, cada grupo:
  `{id, nome, foto, mestres: [...], mestreResponsavel (=mestres[0], compat)}`.
- Ao cadastrar professor (matriz ou via "academia parceira independente"),
  agora só dá pra **selecionar** um grupo já cadastrado (sem criar "na
  hora") e escolher o **mestre responsável** daquele grupo — isso vira o
  `meuMestre` da conta nova, resolvendo o problema de mestrando "solto".
- **Perfil (Editar perfil)** de conta `academia` tem select de grupo/mestre
  também (`perfilGrupoInput` / `perfilGrupoMestreInput`), salva em
  `minhaConta.grupoParceiroId` / `grupoNome` / `meuMestre`.
- **A tela de perfil (visualização) mostra a linha "Grupo"** só se tiver
  `grupoNome` OU `meuMestre` preenchido (não precisa ter grupo formal pra
  aparecer — vínculo direto professor→professor também mostra).
- `cadastrarProfessorVinculadoAMim` (professor cadastra outro professor
  vinculado a si) agora também chama `garantirProfessorComoAlunoDoMestre`
  (antes só salvava o campo, não criava o vínculo de verdade).

## 3. GingaFeed — fotos múltiplas
- **Causa raiz do bug "só aparece a 1ª foto"**: o Firestore tem limite de
  1MB por documento; juntar 3-4 fotos comprimidas num documento só
  estourava esse limite (por isso vinha erro de sync toda hora).
- **Solução**: cada foto volta a ser um documento pequeno e separado
  (como era antes), mas todas compartilham um `postId` + `posicao`. O
  agrupamento em carrossel acontece **na hora de exibir**
  (`agruparFotosEmPosts`), não no armazenamento.
- Excluir um post (`excluirFotoMural`) agora apaga TODAS as fotos daquele
  `postId`, não só uma.
- Limite semanal de fotos (`fotosPostadasNaSemana`) conta por **post**, não
  por foto individual.
- Aplicado o agrupamento em: feed principal (`renderFotosFeed`), feed de
  grupo parceiro (`renderFeedGrupoParceiro`), mural em destaque da Início
  (`iniciarSlideshowMural`), perfil público (`abrirPerfilPublico`).
- **Carrossel do post** (`criarCarrosselFoto`) foi reescrito usando
  **rolagem nativa com scroll-snap** (em vez de detectar gesto manualmente
  com pointerdown/up, que falhava no celular) + setas ‹ › clicáveis como
  reforço. Autoplay a cada 10s (era 5s).

## 4. Vídeo do mural
- Antes só salvava local (IndexedDB), nunca sincronizava.
- Agora sobe pro **Firebase Storage** (`storageBucketRef`, precisa estar
  habilitado no Firebase Console) e o metadado vai pro Firestore
  (`videosNuvemCollection` = `gingapass_videos_nuvem`).
- Fica visível pra todo mundo do grupo por **3 dias**
  (`DIAS_EXPIRACAO_VIDEO`), depois se apaga sozinho (limpeza automática ao
  detectar vídeo vencido, feita por quem publicou ou pela matriz).
- Se o Storage não estiver disponível, cai pro modo local antigo com aviso
  claro (`publicarLocalComoFallback`).

## 5. Endereços de treino
- Antes era uma lista global — qualquer professor via/removia endereço de
  qualquer outro. Corrigido: cada endereço tem `donoId` (quem cadastrou).
  Cada professor só vê/mexe nos próprios; só matriz vê/mexe em todos.
  (`adicionarEndereco`, `renderEnderecos`, `removerEndereco`)

## 6. Presença em eventos + certificados
- Novo botão **"✅ Dar presença"** na lista de eventos e em "Gerenciar
  eventos" (só aparece pra `academia`/`matriz`, nunca pra `aluno`).
- Tela dedicada `presencaEventoTela` (`abrirPresencaEvento`,
  `renderPresencaEvento`) — lista de alunos do grupo com checkbox.
  - **Qualquer professor pode marcar presença.**
  - **Só quem criou o evento (`ev.criadoPor`) ou a matriz pode desmarcar.**
  - Mostra resumo "X de Y confirmados" no topo.
  - Dados em `localStorage['gingapass_checkins_eventos']`:
    `{eventoId (=codigoCheckin), aluno (user), professor, data}`.
- Nova aba **"Meus certificados"** no menu ☰ — visível pra **todas as
  contas** (aluno, academia, matriz; pedido explícito do usuário pra não
  restringir só a aluno).
  - Lista eventos onde a conta tem presença confirmada
    (`renderMeusCertificados` — casa por `user` de login, e pra
    professor/matriz também casa pelo **nome**, já que o vínculo
    professor↔mestre usa uma conta de aluno "sem acesso" com usuário
    fabricado, não o login real).
  - Certificado é gerado na hora num `<canvas>` (`renderizarCertificadoCanvas`):
    usa o **cartaz do evento** como fundo (se existir) + nome completo +
    título do evento + local + data, com moldura.
  - Botão "Baixar certificado" (`baixarCertificado`): tenta
    `navigator.share` (melhor no celular) → senão link de download
    (`<a download>` com Blob) → sempre deixa um link extra "toque aqui pra
    abrir a imagem" como último recurso (Safari iOS é bem inconsistente
    pra baixar imagem gerada por canvas).
  - Layout do certificado (`renderizarCertificadoCanvas`): 2 áreas — em
    cima o cartaz do evento **completo, sem cortar** (object-fit:contain,
    com a própria imagem desfocada de fundo preenchendo as sobras);
    embaixo, faixa fina navy (190px, era 300+) só com o texto (nome,
    evento, local, data) — a faixa era grande demais e roubava espaço do
    cartaz, agora sobra bem mais área pra imagem. Se a academia que criou o
    evento tiver um grupo oficial com foto/logo cadastrada, ela aparece
    como um círculo discreto no canto esquerdo da faixa
    (`obterLogoGrupoDoEvento`).

## 7. Foto do topo do app (".collage", 3 fotos no cabeçalho)
- Bug: às vezes salvava certinho mas sumia ao sair/voltar (mais notado nas
  academias parceiras/independentes, mas era um bug geral).
- **Causa raiz #1** (parcial): `aplicarAparenciaAtual()` roda no login e
  tenta ler as fotos de `window._fotosPerfilMemCache` (cache em memória
  alimentado por leitura assíncrona do IndexedDB) — se essa leitura ainda
  não tinha terminado, a função lia cache vazio e caía nas fotos padrão.
  **Corrigido**: depois que o IndexedDB termina de carregar
  (`carregarFotosPerfilNaMemoria`), agora ele reaplica as fotos do topo
  também.
- **Causa raiz #2** (a principal, achada depois — resolve de vez): o app
  tem um "escutador" da nuvem em tempo real (`dbCollection.onSnapshot`,
  perto da linha ~3198) que traz TODOS os dados salvos (inclusive as fotos
  do topo) assim que conecta — mas só chamava `aplicarPermissoes()` depois,
  nunca `aplicarFotosTopo()`. Ou seja: a foto chegava certinha da nuvem pra
  memória, só não era reaplicada na tela. Isso explica por que sumia
  MESMO quando salvava certo na nuvem — em outro aparelho, ou depois de
  limpar o navegador, o IndexedDB local não tinha nada, e só esse listener
  poderia trazer de volta (mas não estava fazendo isso).
  **Corrigido**: agora, sempre que esse listener recebe mudança, também
  chama `aplicarFotosTopo(obterFotosTopoSalvas(identificadorAparenciaAtual()))`.

## 8. Perfil — telefone/e-mail de conta nova mostrando dados de outra conta
- Bug: ao criar uma conta nova (sem perfil salvo ainda), a tela de Perfil
  simplesmente não atualizava os campos de e-mail/telefone, deixando o que
  tinha ficado renderizado da ÚLTIMA conta vista naquele navegador.
- **Corrigido** em `renderPerfil()`: agora sempre define um valor (mesmo
  que seja "—"), nunca deixa o texto antigo de outra conta.

## 9. Certificado — faixa de texto grande demais
- A faixa azul de texto (embaixo do cartaz, no certificado) estava enorme
  (~390px), roubando espaço da imagem do cartaz.
- **Corrigido**: faixa reduzida pra 190px, cartaz ganhou muito mais área.
  Textos reorganizados/reduzidos pra caber na faixa menor sem cortar nada.
- **Extra**: se a academia que criou o evento tiver um **grupo oficial com
  foto/logo cadastrada** (ver item 2), essa logo aparece como um círculo
  discreto no canto esquerdo da faixa (`obterLogoGrupoDoEvento`).

## 10. Aniversariantes do mês — card duplicado + compartilhar mandava só a foto
- **Bug 1 (card duplicado)**: quando a mesma pessoa tinha mais de uma conta
  com aniversário cadastrado (ex: professor que também é aluno/mestrando em
  outro núcleo — uma conta `academia` e uma `aluno`), ela aparecia com DOIS
  cards no mesmo dia. **Corrigido** em `obterAniversariantesDoMes()`: agora
  deduplica por nome normalizado + dia antes de devolver a lista, mantendo
  só a primeira ocorrência.
- **Bug 2 (compartilhar não mandava o card)**: o botão "Compartilhar"
  (WhatsApp/Instagram) só anexava a FOTO pura da pessoa, sem o card
  desenhado (moldura, "Feliz Aniversário!", nome, faixa colorida, logo do
  grupo). Isso era proposital desde a primeira versão porque tentar
  exportar o card em HTML via SVG `<foreignObject>` travava em vários
  navegadores (principalmente Safari do iPhone, com fonte do Google Fonts
  dentro do foreignObject).
  **Corrigido**: nova função `renderizarCardAniversarioCanvas()` desenha o
  card inteiro num `<canvas>` "na mão" (`fillRect`/`drawImage`/`fillText`,
  sem SVG nem foreignObject) — mesma técnica já comprovada em
  `renderizarCertificadoCanvas()` (funciona até no Safari iOS). O botão de
  compartilhar agora usa essa imagem; se por algum motivo a geração do
  canvas falhar, cai pro comportamento antigo (só a foto) como fallback de
  segurança.
- `criarCardAniversario` agora passa `indice` e `logoGrupo` pros botões de
  compartilhar (antes passava só o elemento HTML do card, que nem era
  usado) — necessário pra pintar o card gerado com a mesma cor do tema e a
  mesma logo de grupo do card exibido na tela.

---

## Coisas que EXISTEM mas têm limitação conhecida
- **Vídeo do mural** depende do Firebase Storage estar habilitado no
  console do projeto (`gingapass-app`). Se não estiver, cai pro modo local
  com aviso.
- **Certificados** dependem do evento ter um **cartaz cadastrado** pra
  ficar bonito com fundo; sem cartaz, usa um fundo azul padrão.
- Vínculo mestre↔mestrando pra contas `academia` usa o campo `meuMestre`
  (texto livre, casa por nome via `mesmoProfessor()`) — não é um ID
  relacional de verdade, então nomes muito diferentes/digitados errado não
  batem sozinhos.

## Onde estão as coisas no arquivo (funções-chave)
- Grupos oficiais: `criarGrupoParceiro`, `cadastrarGrupoOficial`,
  `renderGruposOficiaisTela`, `adicionarMestreAoGrupo`,
  `popularMestresDoGrupoSelecionado`.
- Fotos do mural: `publicarFotoComunidade`, `agruparFotosEmPosts`,
  `criarCarrosselFoto`, `excluirFotoMural`.
- Vídeo: `publicarVideoComunidade`, `excluirVideoDaNuvem`.
- Endereços: `adicionarEndereco`, `renderEnderecos`, `removerEndereco`.
- Eventos/presença/certificados: `adicionarEvento`, `abrirPresencaEvento`,
  `renderPresencaEvento`, `darPresencaEvento`, `removerPresencaEvento`,
  `renderMeusCertificados`, `renderizarCertificadoCanvas`,
  `baixarCertificado`.
- Perfil: `renderPerfil`, `alternarEdicaoPerfilInterno`.
- Aniversariantes do mês: `obterAniversariantesDoMes`, `criarCardAniversario`,
  `renderizarCardAniversarioCanvas`, `compartilharCardAniversario`,
  `renderAniversariantesMes`.
- Aparência/topo: `aplicarAparenciaAtual`, `obterFotosTopoSalvas`,
  `aplicarFotosTopo`, `carregarFotosPerfilNaMemoria`.
