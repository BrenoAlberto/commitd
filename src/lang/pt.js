/* Português (Brasil). A chave é a própria string em inglês; o que não estiver
   aqui aparece em inglês — nunca quebra. Vocabulário de git e do produto
   (branch, commit, merge, checkout, topic, vault, main, sparse-checkout,
   passing/failing) fica em inglês de propósito: é o nome das coisas. */

export const PT = {
  /* ── datas ── */
  'Jan': 'jan', 'Feb': 'fev', 'Mar': 'mar', 'Apr': 'abr', 'May': 'mai', 'Jun': 'jun',
  'Jul': 'jul', 'Aug': 'ago', 'Sep': 'set', 'Oct': 'out', 'Nov': 'nov', 'Dec': 'dez',
  'Sun': 'dom', 'Mon': 'seg', 'Tue': 'ter', 'Wed': 'qua', 'Thu': 'qui', 'Fri': 'sex', 'Sat': 'sáb',
  'today': 'hoje', 'yesterday': 'ontem', '{0}d ago': 'há {0}d', '{0}w ago': 'há {0}sem', '{0}mo ago': 'há {0}m',

  /* ── modelo: cadência, status, métricas ── */
  'every day': 'todo dia', 'weekdays': 'dias úteis',
  'abstain · a clean day is a win': 'abstinência · um dia limpo é vitória',
  '{0}× per week': '{0}× por semana', '{0}× per month': '{0}× por mês', 'no target': 'sem meta',
  'N× / week': 'N× / semana', 'N× / month': 'N× / mês', 'abstain': 'abstinência',
  'clean': 'limpo', 'on cadence': 'na cadência', 'due today': 'pendente hoje',
  'relapse logged today': 'recaída registrada hoje', 'behind cadence': 'atrás da cadência',
  'part of main': 'parte da main',
  'count': 'contagem', 'duration': 'duração', 'time of day': 'horário',
  'amount': 'quantidade', 'rating 1–5': 'nota 1–5', 'yes/no': 'sim/não',

  /* ── seções e abas ── */
  'Today': 'Hoje', 'Overview': 'Visão geral', 'Topics': 'Tópicos', 'Settings': 'Ajustes',
  'relapse': 'recaída',

  /* ── hoje ── */
  '{0} branch waiting': '{0} branch esperando', '{0} branches waiting': '{0} branches esperando',
  'Nothing is waiting': 'Nada esperando',
  '{0} branches checked out': '{0} branches em checkout',
  ' · everything on cadence is done': ' · tudo na cadência está feito',
  'current streak': 'sequência atual', 'days': 'dias', 'this week': 'esta semana',
  'commits in the last 7 days': 'commits nos últimos 7 dias',
  '30-day uptime': 'uptime 30 dias', 'checked-out branches': 'branches em checkout',
  'Last four weeks': 'Últimas quatro semanas', 'the whole year': 'o ano inteiro',
  'Latest': 'Recentes', 'full log': 'log completo',
  'Everything on cadence is done.': 'Tudo na cadência está feito.',
  '{0} more branches are in the vault but not checked out.': 'Mais {0} branches estão no vault sem checkout.',
  '{0} of {1} checked-out branches want a commit': '{0} de {1} branches em checkout pedem um commit',
  ' · behind': ' · atrasada', 'details': 'detalhes', '✓ done': '✓ feito',

  /* ── vault ── */
  'commits in the last year': 'commits no último ano',
  '{0} branches in the vault · {1} checked out · {2} topic branches open':
    '{0} branches no vault · {1} em checkout · {2} topic branches abertas',
  '{0} in the last year': '{0} no último ano',
  '{0} checked out, {1} parked': '{0} em checkout, {1} estacionadas',
  'topic branches': 'topic branches',
  '{0} merged into their parent': '{0} merged na branch-mãe',
  'merged to main': 'merged na main', 'habits that became identity': 'hábitos que viraram identidade',
  'filter…': 'filtrar…', 'list': 'lista', 'cards': 'cards',
  '{0} parked —': '{0} estacionadas —',
  '13 weeks': '13 semanas', 'Streak': 'Sequência', 'Build': 'Build',
  'No branch matches that filter.': 'Nenhuma branch corresponde ao filtro.',
  'on ': 'em ', 'merged into main · {0}': 'merged na main · {0}',
  'best streak': 'melhor sequência', 'streak': 'sequência', 'uptime': 'uptime', 'commits': 'commits',

  /* ── insights ── */
  'Everything below is computed from your own commits and carries its': 'Tudo abaixo é calculado dos seus próprios commits e carrega seu',
  'Nothing here is a nudge or a guess.': 'Nada aqui é empurrão nem chute.',
  'one vault → cross-branch correlation': 'um vault → correlação entre branches',
  'Not enough history yet. These appear once a branch has a few weeks behind it.':
    'Ainda não há histórico suficiente. Isto aparece quando uma branch tiver algumas semanas de vida.',
  'all active branches': 'todas as branches ativas',
  'Breaks and recoveries': 'Pausas e retomadas',
  'restarting well beats never breaking': 'retomar bem vale mais que nunca parar',
  'Longest gap': 'Maior pausa', 'Breaks': 'Pausas', 'Median recovery': 'Retomada mediana',
  '<b>{0}</b> is your strongest day. <b>{1}</b> is where branches go to die.':
    '<b>{0}</b> é o seu dia mais forte. <b>{1}</b> é onde as branches vão morrer.',
  'n={0} commits across {1} active branches': 'n={0} commits em {1} branches ativas',
  'You commit most around <b>{0}</b>.': 'Você commita mais por volta de <b>{0}</b>.',
  'peak of {0} commits · consider moving the reminder 30min earlier':
    'pico de {0} commits · considere adiantar o lembrete em 30min',
  '<span class="mono">{0}</span> commits are <b>{1}×</b> more likely on days you also did <span class="mono">{2}</span>.':
    'commits em <span class="mono">{0}</span> são <b>{1}×</b> mais prováveis em dias que você também fez <span class="mono">{2}</span>.',
  "n={0} days · {1} vs {2} · correlation, not cause — but it's your data":
    'n={0} dias · {1} vs {2} · correlação, não causa — mas o dado é seu',
  'Weekday profile': 'Perfil por dia da semana', 'When you commit': 'Quando você commita',
  'all branches': 'todas as branches', 'final 30 days': '30 dias finais', 'last 30 days': 'últimos 30 dias',
  'target {0}': 'meta {0}',

  /* ── log ── */
  ' across every branch, newest first': ' em todas as branches, mais recentes primeiro',
  ' matching ': ' contendo ',
  'History': 'Histórico', 'branch, word or tag…': 'branch, palavra ou tag…',
  'Nothing matches.': 'Nada corresponde.',
  'load {0} more': 'carregar mais {0}', '{0} of {1}': '{0} de {1}',

  /* ── branch / topic ── */
  'days clean': 'dias limpo', 'longest {0}': 'maior {0}', 'since {0}': 'desde {0}', 'build': 'build',
  'The year, and what it was about': 'O ano, e do que ele foi feito', 'The year': 'O ano',
  'grid = did you practise · lanes = what you practised': 'grid = você praticou · faixas = o que praticou',
  'intensity = ': 'intensidade = ', 'why': 'porquê',
  'Currently working on': 'Foco atual', 'all {0} topics →': 'todos os {0} tópicos →',
  'No topic branch open — the parent is still collecting the streak.':
    'Nenhuma topic branch aberta — a branch-mãe segue somando a sequência.',
  'The parent holds the cadence and the streak. A topic branch holds the goal and the metrics, and merges into the parent when it\'s learned — the streak never notices.':
    'A branch-mãe guarda a cadência e a sequência. Uma topic branch guarda a meta e as métricas, e faz merge na mãe quando o objetivo é alcançado — a sequência nem percebe.',
  '＋ new topic branch': '＋ nova topic branch',
  "when the focus changes, don't rewrite the metrics — branch": 'quando o foco muda, não reescreva as métricas — crie uma branch',
  'opened {0}': 'aberta em {0}', 'now': 'agora', 'open': 'aberta',
  '{0}% of days': '{0}% dos dias', 'per session': 'por sessão', 'target now': 'meta atual',
  'raised from {0} on {1}': 'subiu de {0} em {1}', 'unchanged since day one': 'inalterada desde o início',
  '{0} days': '{0} dias', 'cadence inherited from': 'cadência herdada de', ' · released as ': ' · lançada como ',

  /* ── ajustes ── */
  'Cadence': 'Cadência', 'times per week': 'vezes por semana', 'times per month': 'vezes por mês',
  'Changing cadence recomputes the streak and build status against the new rule — it never touches a commit.':
    'Mudar a cadência recalcula a sequência e o status de build pela nova regra — nenhum commit é tocado.',
  'Metrics': 'Métricas', 'on this branch': 'nesta branch', 'on {0}': 'em {0}',
  'at most': 'no máximo', 'at least': 'no mínimo', 'the target': 'a meta',
  '{0} from {1}': '{0} desde {1}', 'target': 'meta',
  'No metrics — this branch records messages only, and its grid means <b>did you show up</b>.':
    'Sem métricas — esta branch registra só mensagens, e o grid dela significa <b>você apareceu</b>.',
  'Raising a target appends a dated entry instead of overwriting: charts draw the change as a step, and no past commit is re-judged against a target that did not exist yet.':
    'Subir uma meta adiciona uma entrada datada em vez de sobrescrever: os gráficos desenham a mudança como um degrau, e nenhum commit antigo é rejulgado por uma meta que ainda não existia.',
  'Danger zone': 'Zona de perigo',
  "Merging a topic doesn't end the habit — it ends this <em>focus</em>.": 'Fazer merge de um tópico não encerra o hábito — encerra este <em>foco</em>.',
  'keeps its streak; you open the next topic and the metrics change with it.':
    'mantém a sequência; você abre o próximo tópico e as métricas mudam com ele.',
  'Merging closes this branch and squashes its history into': 'O merge encerra esta branch e condensa o histórico dela na',
  '— the record of things that are simply part of how you live now. The grid stays. The pressure doesn\'t.':
    '— o registro do que já é simplesmente parte de como você vive. O grid fica. A pressão não.',
  'park (sparse-checkout out)': 'estacionar (tirar do sparse-checkout)', 'check out': 'fazer checkout',

  /* ── composer ── */
  'which branch?': 'qual branch?',
  'Due today': 'Para hoje', 'Checked out': 'Em checkout', 'Parked': 'Estacionadas',
  'message only': 'só mensagem',
  'No branch matches.': 'Nenhuma branch corresponde.',
  'creates one called': 'cria uma chamada',
  '＋ new branch': '＋ nova branch', 'pick': 'escolher', 'select': 'selecionar',
  'change': 'trocar', 'Message': 'Mensagem',
  'what actually happened — one honest line': 'o que realmente aconteceu — uma linha honesta',
  'Metrics · defined on {0}': 'Métricas · definidas em {0}', 'this branch': 'esta branch',
  'comma, separated, optional': 'separadas, por, vírgula, opcional',
  'cancel': 'cancelar',

  /* ── wizard ── */
  'What is the current focus? e.g. Couch to 5K': 'Qual é o foco atual? ex. Do sofá aos 5K',
  'What are you building? e.g. Gym, Reading, Quit smoking': 'O que você está construindo? ex. Academia, Leitura, Parar de fumar',
  '· stored at': '· guardado em',
  'Goal — one sentence': 'Meta — uma frase',
  'Run 5K without stopping, by the end of March.': 'Correr 5K sem parar, até o fim de março.',
  'Cadence is inherited from': 'A cadência é herdada de',
  'A topic branch never has its own streak — that is the whole point.':
    'Uma topic branch nunca tem sequência própria — esse é exatamente o ponto.',
  'Group': 'Grupo',
  'Groups own the colour, so branch colours stay colourblind-safe past eight branches.':
    'O grupo é dono da cor — assim as cores continuam seguras para daltônicos mesmo com mais de oito branches.',
  "times per {0} — rest days don't break the streak": 'vezes por {0} — dias de descanso não quebram a sequência',
  'week': 'semana', 'month': 'mês',
  'Inverted: every day that passes commits itself, and a commit is a relapse.':
    'Invertida: cada dia que passa se commita sozinho, e um commit é uma recaída.',
  'Label e.g. Minutes': 'Rótulo ex. Minutos', 'unit': 'unidade',
  '＋ add a metric': '＋ adicionar métrica',
  'Leave this empty for a message-only branch. Targets can be raised later without rewriting history — they are stored as a dated list.':
    'Deixe vazio para uma branch só de mensagens. Metas podem subir depois sem reescrever o histórico — ficam guardadas como uma lista datada.',
  'README — your why': 'README — o seu porquê',
  "The sentence you'll need to read at 11pm when you don't want to.":
    'A frase que você vai precisar ler às 23h quando não estiver a fim.',
  'Preview · what committing will look like': 'Prévia · como vai ser commitar',
  'No metrics — the grid will show <b>did you show up</b>.': 'Sem métricas — o grid vai mostrar <b>você apareceu</b>.',
  'create branch': 'criar branch',

  /* ── toasts e ações ── */
  'Read-only — nothing was written': 'Somente leitura — nada foi gravado',
  'GitHub refused that write. The token may not have Contents: read/write on this repo.':
    'O GitHub recusou a gravação. A sessão pode não ter Contents: leitura/escrita neste repositório.',
  'Vault not found — check the repository still exists.': 'Vault não encontrado — confira se o repositório ainda existe.',
  'writing commit': 'gravando commit', 'creating branch': 'criando branch',
  'opening topic branch': 'abrindo topic branch', 'merging topic': 'fazendo merge do tópico',
  'merging branch': 'fazendo merge da branch', 'saving cadence': 'salvando cadência',
  'saving target': 'salvando meta', 'saving': 'salvando',
  'Give it a name first': 'Dê um nome primeiro',
  'A branch called {0} already exists': 'Já existe uma branch chamada {0}',
  'created': 'criada', 'metric': 'métrica', 'metrics': 'métricas',
  'opened — new goal, new metrics, <b>same streak</b>': 'aberta — nova meta, novas métricas, <b>mesma sequência</b>',
  'merged into': 'merged em', 'tagged': 'com tag', 'The streak is untouched.': 'A sequência segue intacta.',
  '{0} commits, {1}-day best streak. It\'s yours now.': '{0} commits, melhor sequência de {1} dias. Agora é seu.',
  'cadence →': 'cadência →', '· streak recomputed, no commit touched': '· sequência recalculada, nenhum commit tocado',
  'target → {0} from today · earlier commits keep the old target': 'meta → {0} a partir de hoje · commits antigos mantêm a meta anterior',
  'checked out — back in the sidebar and the queue': 'em checkout — de volta à barra lateral e à fila',
  'parked — history kept, attention returned': 'estacionada — histórico mantido, atenção devolvida',
  'making the repository public': 'tornando o repositório público',
  'making the repository private': 'tornando o repositório privado',
  'Vault is public. Anyone with the link can read it — nobody can write to it.':
    'O vault está público. Qualquer pessoa com o link pode ler — ninguém consegue escrever.',
  'Vault is private again. Existing links stop resolving.': 'O vault está privado de novo. Links existentes param de resolver.',
  'Your token cannot change repository visibility — it needs Administration: read/write, or you can flip it on github.com.':
    'Sua sessão não pode mudar a visibilidade do repositório — precisa de Administration: leitura/escrita, ou mude direto no github.com.',
  'rebuilding index from every log file': 'reconstruindo o índice de todos os logs',
  'Rebuilt from your logs — everything is in sync.': 'Reconstruído dos seus logs — tudo em sincronia.',
  'reading {0} history': 'lendo o histórico de {0}',
  'Link copied': 'Link copiado',

  /* ── shell, drawer, paleta ── */
  "That didn't work": 'Isso não funcionou', 'back': 'voltar',
  'No such branch': 'Essa branch não existe', 'back to vault': 'voltar ao vault',
  'Nothing committed on this day.': 'Nada commitado neste dia.',
  '{0} commit': '{0} commit', '{0} commits': '{0} commits',
  '＋ commit': '＋ commit', 'no commit': 'sem commit',
  'Merge {0} into main?': 'Fazer merge de {0} na main?',
  'The branch closes and its history squashes into main. The grid stays forever.':
    'A branch se encerra e o histórico é condensado na main. O grid fica para sempre.',
  'log an instance': 'registrar uma instância', 'get started': 'começar',
  'connect github': 'conectar github',
  'goto {0}': 'ir para {0}', 'branch': 'branch', 'topic branch': 'topic branch', 'merged topic': 'tópico merged',
  'create a branch': 'criar uma branch', 'new focus, same streak': 'novo foco, mesma sequência',
  'park branches you are not running': 'estacione branches fora de uso',
  'visibility, index, session': 'visibilidade, índice, sessão',
  'vault settings': 'ajustes do vault', 'rebuild index': 'reconstruir índice',
  'theme toggle': 'alternar tema', 'dark ⇄ light': 'escuro ⇄ claro',
  'Everything stays in the vault and keeps its history. Checking a branch out just means it appears in the sidebar and in today\'s queue. Park the ones you are not working on —':
    'Tudo continua no vault e mantém o histórico. Fazer checkout de uma branch só significa que ela aparece na barra lateral e na fila de hoje. Estacione as que você não está tocando —',
  'a habit you are not currently running should not cost you attention every morning.':
    'um hábito que você não está rodando agora não deveria custar atenção toda manhã.',
  'done': 'pronto',
  '{0} branches in the vault but not checked out —': '{0} branches no vault sem checkout —',
  '{0} branch in the vault but not checked out —': '{0} branch no vault sem checkout —',
  'new branch': 'nova branch', 'less': 'menos', 'more': 'mais', 'heat': 'calor', 'by branch': 'por branch',
  'Merged into main': 'Merged na main', 'Head': 'Head', 'filter branches': 'filtrar branches',
  'Run a command': 'Executar comando',

  /* ── landing ── */
  'a daemon for the habits you keep': 'um daemon para os hábitos que você mantém',
  'Your habits,<br>as a git repository.': 'Seus hábitos,<br>como um repositório git.',
  'The mental model you already trust — branches, commits, a green grid — pointed at your life. Every workout, every page read, every day quit lives in one private GitHub repo that you own. No server, no account, no subscription. There is no us.':
    'O modelo mental em que você já confia — branches, commits, um grid verde — apontado para a sua vida. Cada treino, cada página lida, cada dia sem recaída vive em um repositório privado do GitHub que é seu. Sem servidor, sem conta, sem assinatura. Não existe "nós".',
  'Connect GitHub': 'Conectar GitHub', 'Read the source ↗': 'Ler o código ↗',
  'Someone shared a vault with you?': 'Alguém compartilhou um vault com você?',
  'Open it here': 'Abra aqui',
  'No servers': 'Sem servidores',
  'commitd is a static page. There is no backend to breach, no database to leak, nothing to go down.':
    'O commitd é uma página estática. Não há backend para invadir, banco para vazar, nada para cair.',
  'No data held': 'Nenhum dado retido',
  "We couldn't read your habits if we wanted to — every byte lives in your repository, private or public, on your account.":
    'Não conseguiríamos ler seus hábitos nem se quiséssemos — cada byte vive no seu repositório, privado ou público, na sua conta.',
  'No lock-in': 'Sem lock-in',
  "It's just git. Clone your vault, grep it, take it anywhere — commitd disappearing costs you nothing.":
    'É só git. Clone seu vault, faça grep, leve para onde quiser — se o commitd sumir, você não perde nada.',
  'The model': 'O modelo',
  'A <b>branch</b> is a habit —': 'Uma <b>branch</b> é um hábito —',
  '— a long-lived line of work. A <b>commit</b> is one instance of showing up: a message, numbers if you want them.':
    '— uma linha de trabalho de longo prazo. Um <b>commit</b> é uma vez em que você apareceu: uma mensagem, números se quiser.',
  'Goals change; habits persist.': 'Metas mudam; hábitos ficam.',
  'is for life,': 'é para a vida,',
  'is for twelve weeks — so the goal and its numbers live on a <b>topic branch</b> that merges back when it\'s done. The streak never notices.':
    'é para doze semanas — então a meta e seus números vivem numa <b>topic branch</b> que faz merge de volta quando termina. A sequência nem percebe.',
  'And when showing up stops needing a tracker, you <b>merge the habit into main</b>: the record of things that are simply how you live now. The goal was never to track forever. The goal is to merge.':
    'E quando aparecer deixa de precisar de rastreador, você faz <b>merge do hábito na main</b>: o registro do que já é simplesmente como você vive. A meta nunca foi rastrear para sempre. A meta é fazer merge.',
  'What it does differently': 'O que ele faz diferente',
  'Cadence, not guilt': 'Cadência, não culpa',
  "A 3×/week branch keeps its streak through a rest day. Uptime sits next to the streak, because 94% survives one bad Tuesday and a streak doesn't.":
    'Uma branch 3×/semana mantém a sequência no dia de descanso. O uptime fica ao lado da sequência, porque 94% sobrevive a uma terça ruim — e uma sequência não.',
  'Quitting counts too': 'Largar também conta',
  'An abstain branch fills the grid green on its own; a commit is a relapse, logged without judgement — because a hidden relapse is the one that wins.':
    'Uma branch de abstinência preenche o grid de verde sozinha; um commit é uma recaída, registrada sem julgamento — porque a recaída escondida é a que vence.',
  'Your real contribution graph': 'Seu contribution graph de verdade',
  'Each entry is one true git commit, dated the day it happened. Showing up for yourself looks exactly like shipping.':
    'Cada registro é um commit git de verdade, datado do dia em que aconteceu. Aparecer por você mesmo fica igualzinho a entregar código.',
  'Plain text forever': 'Texto puro para sempre',
  'One JSON line per entry, in files you can read. If commitd vanished tomorrow, your data is still yours —':
    'Uma linha JSON por registro, em arquivos que você consegue ler. Se o commitd sumisse amanhã, seus dados continuam seus —',
  'still works.': 'continua funcionando.',
  'Yours, verifiably': 'Seu, comprovadamente',
  'commitd is a static page and one small GitHub App. You install the app on <b>one repository</b> — the vault — and that is everything it can ever see. No analytics, no tracking, nothing phoned home; the source is short enough to read in an afternoon.':
    'O commitd é uma página estática e um pequeno GitHub App. Você instala o app em <b>um repositório</b> — o vault — e isso é tudo o que ele pode ver. Sem analytics, sem rastreamento, nada é enviado a lugar nenhum; o código é curto o bastante para ler numa tarde.',
  'Your vault stays <b>private</b> unless you decide otherwise. Make it public later and anyone with the link gets a read-only view.':
    'Seu vault fica <b>privado</b> a menos que você decida o contrário. Torne-o público depois e qualquer pessoa com o link ganha uma visão somente leitura.',
  'you/habits · 3 branches': 'voce/habitos · 3 branches', 'read': 'leitura', 'gym': 'academia',
  'quit-smoking': 'parar-de-fumar', '{0}d · {1}%': '{0}d · {1}%', '231 days clean': '231 dias limpo',

  /* ── conectar / instalar ── */
  'Connect your GitHub': 'Conecte seu GitHub',
  'Two clicks. commitd keeps every byte in one private repository — the vault — and can only ever see the repositories you install it on.':
    'Dois cliques. O commitd guarda cada byte em um repositório privado — o vault — e só consegue ver os repositórios em que você o instalar.',
  'Create the vault — once': 'Crie o vault — uma vez só',
  'One private repository holds every habit. Already made one? Skip straight to step 2.':
    'Um repositório privado guarda todos os hábitos. Já criou? Pule direto para o passo 2.',
  'Create {0} on GitHub ↗': 'Criar {0} no GitHub ↗',
  'Keep it <b>Private</b> and tick <b>Add a README</b>, then come back to this tab.':
    'Deixe <b>Private</b> e marque <b>Add a README</b>, depois volte para esta aba.',
  'Sign in with GitHub': 'Entrar com GitHub',
  'GitHub asks where to install commitd — choose <b>Only select repositories</b> and pick just the vault. commitd finds it from there by itself: nothing to paste, nothing to configure.':
    'O GitHub pergunta onde instalar o commitd — escolha <b>Only select repositories</b> e selecione só o vault. Dali o commitd encontra tudo sozinho: nada para colar, nada para configurar.',
  'One more step, {0}': 'Falta um passo, {0}',
  "You're signed in, but commitd isn't installed on any repository yet — and installing it on the vault is the thing that grants access. commitd can only ever see the repositories you install it on.":
    'Você está conectado, mas o commitd ainda não está instalado em nenhum repositório — e instalar no vault é o que concede o acesso. O commitd só consegue ver os repositórios em que você o instalar.',
  'Have a vault repository?': 'Já tem um repositório para o vault?',
  'If not, create it now — private, with a README.': 'Se não, crie agora — privado, com um README.',
  'Install commitd on it': 'Instale o commitd nele',
  'Choose <b>Only select repositories</b> → the vault. GitHub sends you straight back here.':
    'Escolha <b>Only select repositories</b> → o vault. O GitHub te traz direto de volta.',
  'Install commitd on the vault ↗': 'Instalar o commitd no vault ↗',
  "Installed it in another tab and landed back here?": 'Instalou em outra aba e caiu de volta aqui?',
  'Check again': 'Verificar de novo', 'sign out instead': 'ou sair da conta',
  'That repository is public': 'Esse repositório é público',
  'commitd is installed on': 'O commitd está instalado em',
  ', which anyone on the internet can read. A vault holds every habit and every honest commit message — it should start private.':
    ', que qualquer pessoa na internet pode ler. Um vault guarda cada hábito e cada mensagem honesta de commit — ele deve começar privado.',
  'Pick a private home for it': 'Escolha um lar privado para ele',
  'Either make that repository private': 'Torne esse repositório privado',
  'repository settings ↗': 'configurações do repositório ↗',
  ', or create a private': ', ou crie um',
  'and point the installation at it': 'privado e aponte a instalação para ele',
  'configure ↗': 'configurar ↗',
  'Which one is the vault?': 'Qual deles é o vault?',
  'commitd is installed on {0} repositories. Habit data lives in exactly one — pick it. (You can trim the installation to a single repository any time on GitHub.)':
    'O commitd está instalado em {0} repositórios. Os hábitos vivem em exatamente um — escolha. (Você pode restringir a instalação a um único repositório a qualquer momento no GitHub.)',
  'public': 'público',
  'finishing sign-in': 'concluindo o login', 'finding your vault': 'procurando seu vault',
  'opening the vault': 'abrindo o vault', 'bootstrapping the vault': 'inicializando o vault',
  'opening vault': 'abrindo o vault', 'starting': 'iniciando', 'reading vault': 'lendo o vault',
  'no index — rebuilding from logs': 'sem índice — reconstruindo dos logs',
  'reading {0} branches': 'lendo {0} branches',
  'That repository is not a commitd vault.': 'Esse repositório não é um vault do commitd.',
  'The stored token is no longer valid — it may have expired. Sign in again.':
    'A sessão guardada não vale mais — pode ter expirado. Entre de novo.',
  "GitHub can't see {0}/{1}. Create it at github.com/new?name={1} (private, tick \"Add a README\"), make sure the commitd app is installed on it (github.com/apps/{2}), then sign in again.":
    'O GitHub não enxerga {0}/{1}. Crie em github.com/new?name={1} (privado, marque "Add a README"), confirme que o app commitd está instalado nele (github.com/apps/{2}) e entre de novo.',

  /* ── vault settings / público ── */
  'Vault': 'Vault',
  '{0} active branch': '{0} branch ativa', '{0} active branches': '{0} branches ativas',
  ' · {0} merged': ' · {0} merged', 'private': 'privado',
  'Visibility': 'Visibilidade', 'Private': 'Privado',
  'Only you can read the repository. This is the default, and where a vault should stay unless you have a reason. Nobody can see the link, the grid, or a single commit message.':
    'Só você lê o repositório. Esse é o padrão, e é onde um vault deve ficar salvo boa razão. Ninguém vê o link, o grid, nem uma única mensagem de commit.',
  'Public — read-only for everyone else': 'Público — somente leitura para todo o resto',
  'Anyone with the link sees your grid, branches and history. <b>Nobody but you can write to it</b>: they have no token, and GitHub will not accept commits from them.':
    'Qualquer pessoa com o link vê seu grid, suas branches e seu histórico. <b>Ninguém além de você escreve</b>: não têm credencial, e o GitHub não aceita commits deles.',
  'Going public exposes, to anyone who asks:': 'Tornar público expõe, a quem quiser ver:',
  'every branch name, README and goal': 'cada nome de branch, README e meta',
  '<b>every commit message you have ever written</b>, including the honest ones':
    '<b>cada mensagem de commit que você já escreveu</b>, inclusive as honestas',
  'every metric value, date and time of day': 'cada valor de métrica, data e horário',
  'relapses on abstain branches': 'recaídas nas branches de abstinência',
  'Turning it back to private stops new readers, but anything already copied or cached stays copied.':
    'Voltar para privado barra novos leitores, mas o que já foi copiado ou cacheado continua copiado.',
  '<b>This vault is public.</b> Share this link — it opens a read-only view that needs no token and no account.':
    '<b>Este vault é público.</b> Compartilhe este link — abre uma visão somente leitura que não pede credencial nem conta.',
  'copy': 'copiar',
  'The repository itself is also readable at': 'O próprio repositório também pode ser lido em',
  ', and its README renders your grid in ASCII.': ', e o README dele desenha seu grid em ASCII.',
  'Maintenance': 'Manutenção', 'Rebuild from logs': 'Reconstruir dos logs',
  "Something looks out of sync — a missing commit, a wrong streak? This re-reads every log in the repository and rebuilds the app's view from scratch. Your data is never touched.":
    'Algo parece fora de sincronia — um commit sumido, uma sequência errada? Isto relê todos os logs do repositório e reconstrói a visão do app do zero. Seus dados nunca são tocados.',
  'rebuild': 'reconstruir', 'Session': 'Sessão', 'Signed in as {0}': 'Conectado como {0}',
  'Through the commitd GitHub App — it sees this repository and nothing else. The session lives in this tab; signing back in is one click.':
    'Pelo GitHub App do commitd — ele vê este repositório e nada mais. A sessão vive nesta aba; entrar de novo é um clique.',
  'manage on GitHub': 'gerenciar no GitHub', 'sign out': 'sair',
  'Language': 'Idioma',
  'You are about to make': 'Você está prestes a tornar',
  'readable by anyone on the internet.': 'legível por qualquer pessoa na internet.',
  'That includes:': 'Isso inclui:',
  '<b>every commit message you have ever written</b>': '<b>cada mensagem de commit que você já escreveu</b>',
  'Nobody else can write to it — they have no token, and GitHub will not accept commits from them. Turning it back to private stops new readers, but anything already copied stays copied.':
    'Ninguém mais escreve nele — não têm credencial, e o GitHub não aceita commits deles. Voltar para privado barra novos leitores, mas o que já foi copiado continua copiado.',
  'make it public': 'tornar público',
  'Open a public vault': 'Abrir um vault público',
  'Read-only, no token, no account. Only works if that person made their vault public.':
    'Somente leitura, sem credencial, sem conta. Só funciona se a pessoa tornou o vault dela público.',
  'github username': 'usuário do github',
  'Viewing': 'Vendo', 'open': 'abrir', '— read-only.': '— somente leitura.', 'leave': 'sair',
  'reading public vault': 'lendo vault público',
  'No public vault at {0}/{1}. It may be private, or may not exist.':
    'Nenhum vault público em {0}/{1}. Pode ser privado, ou não existir.',
  'GitHub rate-limited this network for anonymous reads. Try again in a few minutes.':
    'O GitHub limitou leituras anônimas desta rede. Tente de novo em alguns minutos.',
  'the new repository is still initialising — give it a few seconds and try again':
    'o repositório novo ainda está inicializando — espere alguns segundos e tente de novo',
  'token exchange failed': 'a troca do código falhou', 'token refresh failed': 'a renovação da sessão falhou',
};
