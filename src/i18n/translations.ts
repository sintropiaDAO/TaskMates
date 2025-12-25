export type Language = 'pt' | 'en';

export interface TranslationKeys {
  // Common
  loading: string;
  save: string;
  cancel: string;
  add: string;
  edit: string;
  delete: string;
  close: string;
  or: string;
  user: string;
  error: string;
  success: string;
  back: string;
  
  // Hero
  heroSubtitle: string;
  heroDescription: string;
  heroFeatureCollaboration: string;
  heroFeatureMatchmaking: string;
  heroFeatureRegenerative: string;
  heroStartNow: string;
  heroHaveAccount: string;
  
  // Auth
  authLogin: string;
  authSignup: string;
  authLoginTitle: string;
  authSignupTitle: string;
  authLoginSubtitle: string;
  authSignupSubtitle: string;
  authFullName: string;
  authFullNamePlaceholder: string;
  authEmail: string;
  authEmailPlaceholder: string;
  authPassword: string;
  authPasswordPlaceholder: string;
  authNoAccount: string;
  authHaveAccount: string;
  authConnectMetamask: string;
  authWelcomeBack: string;
  authAccountCreated: string;
  authConfigureProfile: string;
  authValidationError: string;
  authInvalidEmail: string;
  authPasswordMin: string;
  authLoginError: string;
  authSignupError: string;
  authInvalidCredentials: string;
  authEmailRegistered: string;
  authWalletConnected: string;
  authWalletError: string;
  authUnexpectedError: string;
  
  // Dashboard Header
  dashboardConnectWallet: string;
  dashboardLogout: string;
  dashboardLocationNotSet: string;
  
  // Notifications
  notificationsTitle: string;
  notificationsNew: string;
  notificationsMarkAll: string;
  notificationsEmpty: string;
  
  // Tasks
  taskOffer: string;
  taskRequest: string;
  taskPersonal: string;
  taskCreateTitle: string;
  taskEditTitle: string;
  taskTypeLabel: string;
  taskOfferDescription: string;
  taskRequestDescription: string;
  taskPersonalDescription: string;
  taskTitle: string;
  taskTitlePlaceholder: string;
  taskDescription: string;
  taskDescriptionPlaceholder: string;
  taskDeadline: string;
  taskDeadlineOptional: string;
  taskRelatedSkills: string;
  taskCommunities: string;
  taskChangeType: string;
  taskCreate: string;
  taskCollaborate: string;
  taskRequestAction: string;
  taskCollaborators: string;
  taskRequesters: string;
  taskInterestedPeople: string;
  taskMarkComplete: string;
  taskCompleted: string;
  taskComments: string;
  taskAddComment: string;
  taskFeedback: string;
  taskAddFeedback: string;
  taskCompletionProof: string;
  taskCreatedOn: string;
  taskDeadlineLabel: string;
  taskBlockchainRegistered: string;
  taskCollaborationSent: string;
  taskAlreadyCollaborated: string;
  taskRequestSent: string;
  taskAlreadyRequested: string;
  taskCommentAdded: string;
  taskFeedbackAdded: string;
  taskCompletedSuccess: string;
  taskProofRegistered: string;
  taskAddProof: string;
  taskUploadFile: string;
  taskExternalLink: string;
  taskLinkPlaceholder: string;
  taskSelectFile: string;
  taskFileSelected: string;
  taskInvalidFileType: string;
  taskFileTooLarge: string;
  taskUploadError: string;
  taskVoteError: string;
  taskYouOfferSomething: string;
  taskYouNeedHelp: string;
  taskPersonalNote: string;
  taskCompleteTitle: string;
  taskCompleteDescription: string;
  taskSendFeedback: string;
  taskLeaveFeedback: string;
  taskRemove: string;
  taskClickToSelect: string;
  taskMax10MB: string;
  taskPasteLinkHere: string;
  taskConfirmCompletion: string;
  taskSending: string;
  taskRegisteredBlockchain: string;
  taskEvaluation: string;
  
  // Report
  averageRating: string;
  ratings: string;
  ratingHistory: string;
  task: string;
  rater: string;
  rating: string;
  date: string;
  anonymous: string;
  
  // Profile
  profileEditTitle: string;
  profileEditSubtitle: string;
  profileFullName: string;
  profileFullNamePlaceholder: string;
  profileLocation: string;
  profileLocationPlaceholder: string;
  profileBio: string;
  profileBioPlaceholder: string;
  profileSkillsTitle: string;
  profileSkillsDescription: string;
  profileCommunitiesTitle: string;
  profileCommunitiesDescription: string;
  profileCreateSkill: string;
  profileCreateCommunity: string;
  profileSaveProfile: string;
  profileSaveError: string;
  profileSaved: string;
  profileTagAdded: string;
  profileTagRemoved: string;
  profileTagCreatedAdded: string;
  profileNotFound: string;
  profileFollow: string;
  profileUnfollow: string;
  profileFollowing: string;
  profileUnfollowed: string;
  profileFollowers: string;
  profileFollowingLabel: string;
  profileAvatarInvalidType: string;
  profileAvatarTooLarge: string;
  profileAvatarUpdated: string;
  profileAvatarError: string;
  profileAvatarHint: string;
  
  // Tags Manager
  tagsManageTitle: string;
  tagsSkillsTitle: string;
  tagsCommunitiesTitle: string;
  tagsAvailable: string;
  tagsSkillName: string;
  tagsCommunityName: string;
  tagsNoSkills: string;
  tagsNoCommunities: string;
  tagsSkillCreated: string;
  tagsCommunityCreated: string;
  tagsCreateError: string;
  tagsExistsOrError: string;
  tagDetails: string;
  tagDeleted: string;
  createdBy: string;
  relatedTasks: string;
  noRelatedTasks: string;
  relatedProfiles: string;
  noRelatedProfiles: string;
  taskOpen: string;
  tagDuplicate: string;
  createNewTag: string;
  similarTagsFound: string;
  exactMatch: string;
  tagAlreadyExists: string;
  clickToSelect: string;
  
  // Admin Page
  adminPanel: string;
  adminUsers: string;
  adminTranslations: string;
  makeAdmin: string;
  searchTags: string;
  selectTag: string;
  translations: string;
  translationsFor: string;
  addTranslation: string;
  language: string;
  selectLanguage: string;
  translatedName: string;
  translatedNamePlaceholder: string;
  selectTagToTranslate: string;
  
  // Dashboard Page
  dashboardHello: string;
  dashboardWelcomeMessage: string;
  dashboardRecommendedTitle: string;
  dashboardRecommendedSubtitle: string;
  dashboardMyTasksTitle: string;
  dashboardMyTasksSubtitle: string;
  dashboardCompletedTitle: string;
  dashboardAllTasksTitle: string;
  dashboardAllTasksSubtitle: string;
  dashboardCreateTask: string;
  dashboardCreateTags: string;
  dashboardEditProfile: string;
  dashboardReport: string;
  dashboardManageTags: string;
  dashboardRecommended: string;
  dashboardMyTasks: string;
  dashboardCompleted: string;
  dashboardNoRecommendations: string;
  dashboardNoMyTasks: string;
  dashboardNoTasksCreated: string;
  dashboardNoCompletedTasks: string;
  dashboardNoTasks: string;
  dashboardConfigureProfile: string;
  dashboardConfigureProfileMessage: string;
  dashboardNoMatchingTasks: string;
  dashboardCreateFirstTask: string;
  dashboardCompletedTasksAppear: string;
  dashboardPersonalReport: string;
  dashboardCompletedCount: string;
  dashboardKeepGoing: string;
  dashboardTaskCreated: string;
  dashboardTaskUpdated: string;
  dashboardTaskDeleted: string;
  dashboardFollowingTasks: string;
  noFollowers: string;
  noFollowing: string;
  
  // Activity
  taskStatistics: string;
  tasksCreated: string;
  tasksCompleted: string;
  recentActivity: string;
  createdTask: string;
  completedTask: string;
  joinedTask: string;
  
  // User Search
  searchUsers: string;
  searchUsersDescription: string;
  searchPlaceholder: string;
  filterAll: string;
  filterSkills: string;
  filterCommunities: string;
  recommendedForYou: string;
  searchResults: string;
  allUsers: string;
  noUsersFound: string;
  compatibility: string;
  
  // Activity Feed
  activityFeedTitle: string;
  activityCreatedTask: string;
  activityCompletedTask: string;
  activityJoinedTask: string;
  activityStartedFollowing: string;
  activityNoFollowing: string;
  activityNoFollowingDescription: string;
  activityEmpty: string;
  activityEmptyDescription: string;
  activityFeed: string;
  
  // Notification Settings
  notificationSettings: string;
  notificationSettingsSaved: string;
  notificationPermissionDenied: string;
  emailNotifications: string;
  emailNotificationsDescription: string;
  emailAddress: string;
  emailPlaceholder: string;
  emailOptional: string;
  pushNotifications: string;
  pushNotificationsDescription: string;
  pushNotificationsNotSupported: string;
  pushNotificationsBlocked: string;
  
  // Language
  languageSelect: string;
  languagePortuguese: string;
  languageEnglish: string;
  
  // Reputation & Testimonials
  reputation: string;
  ratingsReceived: string;
  noRatingsYet: string;
  commonTags: string;
  testimonials: string;
  writeTestimonial: string;
  addTagsToTestimonial: string;
  testimonialAdded: string;
  testimonialDeleted: string;
  hideTags: string;
  addTags: string;
  send: string;
  noTestimonialsYet: string;
  
  // Task Rating
  rateCollaborators: string;
  rateTaskOwner: string;
  yourRating: string;
  ratingSubmitted: string;
  pendingRatings: string;
  pendingRatingsCount: string;
  moreTasks: string;
  
  // Collaborator Approval
  approve: string;
  reject: string;
  approved: string;
  rejected: string;
  pending: string;
  approveCollaborator: string;
  rejectCollaborator: string;
  collaboratorApproved: string;
  collaboratorRejected: string;
  allowCollaboration: string;
  allowRequests: string;
  collaborationDisabled: string;
  requestsDisabled: string;
  taskSettings: string;
  settingsSaved: string;
}

export const translations: Record<Language, TranslationKeys> = {
  pt: {
    // Common
    loading: 'Carregando...',
    save: 'Salvar',
    cancel: 'Cancelar',
    add: 'Adicionar',
    edit: 'Editar',
    delete: 'Excluir',
    close: 'Fechar',
    or: 'ou',
    user: 'Usuário',
    error: 'Erro',
    success: 'Sucesso',
    back: 'Voltar',
    
    // Hero
    heroSubtitle: 'Nutrindo a Vida',
    heroDescription: 'Uma rede social focada em tarefas onde o matchmaking de habilidades potencializa conexões colaborativas e regenerativas.',
    heroFeatureCollaboration: 'Colaboração',
    heroFeatureMatchmaking: 'Matchmaking',
    heroFeatureRegenerative: 'Regenerativo',
    heroStartNow: 'Começar Agora',
    heroHaveAccount: 'Já tenho conta',
    
    // Auth
    authLogin: 'Entrar',
    authSignup: 'Criar conta',
    authLoginTitle: 'Entrar',
    authSignupTitle: 'Criar conta',
    authLoginSubtitle: 'Acesse sua conta para continuar',
    authSignupSubtitle: 'Junte-se à comunidade regenerativa',
    authFullName: 'Nome completo',
    authFullNamePlaceholder: 'Seu nome',
    authEmail: 'Email',
    authEmailPlaceholder: 'seu@email.com',
    authPassword: 'Senha',
    authPasswordPlaceholder: '••••••••',
    authNoAccount: 'Não tem conta?',
    authHaveAccount: 'Já tem conta?',
    authConnectMetamask: 'Conectar MetaMask',
    authWelcomeBack: 'Bem-vindo de volta!',
    authAccountCreated: 'Conta criada!',
    authConfigureProfile: 'Configure seu perfil para começar.',
    authValidationError: 'Erro de validação',
    authInvalidEmail: 'Email inválido',
    authPasswordMin: 'Senha deve ter no mínimo 6 caracteres',
    authLoginError: 'Erro ao entrar',
    authSignupError: 'Erro ao cadastrar',
    authInvalidCredentials: 'Email ou senha incorretos',
    authEmailRegistered: 'Este email já está cadastrado',
    authWalletConnected: 'Carteira conectada!',
    authWalletError: 'Erro ao conectar carteira',
    authUnexpectedError: 'Ocorreu um erro inesperado',
    
    // Dashboard Header
    dashboardConnectWallet: 'Conectar Wallet',
    dashboardLogout: 'Sair',
    dashboardLocationNotSet: 'Localização não definida',
    
    // Notifications
    notificationsTitle: 'Notificações',
    notificationsNew: 'novas',
    notificationsMarkAll: 'Marcar todas',
    notificationsEmpty: 'Nenhuma notificação',
    
    // Tasks
    taskOffer: 'Oferta',
    taskRequest: 'Solicitação',
    taskPersonal: 'Pessoal',
    taskCreateTitle: 'Criar Tarefa',
    taskEditTitle: 'Editar Tarefa',
    taskTypeLabel: 'Tipo de Tarefa',
    taskOfferDescription: 'Você tem algo para oferecer',
    taskRequestDescription: 'Você precisa de ajuda',
    taskPersonalDescription: 'Uma tarefa pessoal para você',
    taskTitle: 'Título',
    taskTitlePlaceholder: 'Ex: Ajuda com jardinagem comunitária',
    taskDescription: 'Descrição',
    taskDescriptionPlaceholder: 'Descreva os detalhes da tarefa...',
    taskDeadline: 'Prazo',
    taskDeadlineOptional: 'Prazo (opcional)',
    taskRelatedSkills: 'Habilidades relacionadas',
    taskCommunities: 'Comunidades',
    taskChangeType: 'Alterar tipo',
    taskCreate: 'Criar Tarefa',
    taskCollaborate: 'Colaborar',
    taskRequestAction: 'Solicitar',
    taskCollaborators: 'Colaboradores',
    taskRequesters: 'Solicitantes',
    taskInterestedPeople: 'Pessoas interessadas',
    taskMarkComplete: 'Marcar como Concluída',
    taskCompleted: 'Concluída',
    taskComments: 'Comentários',
    taskAddComment: 'Adicionar comentário...',
    taskFeedback: 'Feedback',
    taskAddFeedback: 'Adicionar feedback...',
    taskCompletionProof: 'Prova de Conclusão',
    taskCreatedOn: 'Criada em',
    taskDeadlineLabel: 'Prazo',
    taskBlockchainRegistered: 'Registrado na Scroll Blockchain',
    taskCollaborationSent: 'Solicitação de colaboração enviada!',
    taskAlreadyCollaborated: 'Você já solicitou colaboração nesta tarefa.',
    taskRequestSent: 'Solicitação enviada!',
    taskAlreadyRequested: 'Você já fez uma solicitação nesta tarefa.',
    taskCommentAdded: 'Comentário adicionado!',
    taskFeedbackAdded: 'Feedback adicionado!',
    taskCompletedSuccess: 'Tarefa concluída!',
    taskProofRegistered: 'A prova foi registrada com sucesso.',
    taskAddProof: 'Adicione uma prova de conclusão',
    taskUploadFile: 'Upload de Arquivo',
    taskExternalLink: 'Link Externo',
    taskLinkPlaceholder: 'https://...',
    taskSelectFile: 'Selecionar Arquivo (imagem ou PDF)',
    taskFileSelected: 'Arquivo selecionado',
    taskInvalidFileType: 'Tipo de arquivo inválido. Use imagem ou PDF.',
    taskFileTooLarge: 'Arquivo muito grande. Máximo 10MB.',
    taskUploadError: 'Erro ao fazer upload do arquivo',
    taskVoteError: 'Erro ao votar',
    taskYouOfferSomething: 'Você tem algo para oferecer',
    taskYouNeedHelp: 'Você precisa de ajuda',
    taskPersonalNote: 'Uma nota ou tarefa pessoal',
    taskCompleteTitle: 'Concluir Tarefa',
    taskCompleteDescription: 'Adicione uma prova de conclusão para registrar esta tarefa na blockchain.',
    taskSendFeedback: 'Enviar Feedback',
    taskLeaveFeedback: 'Deixe seu feedback sobre esta tarefa...',
    taskRemove: 'Remover',
    taskClickToSelect: 'Clique para selecionar foto ou PDF',
    taskMax10MB: 'Máximo 10MB',
    taskPasteLinkHere: 'Cole o link da prova aqui...',
    taskConfirmCompletion: 'Confirmar Conclusão',
    taskSending: 'Enviando...',
    taskRegisteredBlockchain: 'Registrada na blockchain. TX:',
    taskEvaluation: 'Avaliação da Tarefa',
    
    // Profile
    profileEditTitle: 'Editar Perfil',
    profileEditSubtitle: 'Complete seu perfil para encontrar tarefas relevantes',
    profileFullName: 'Nome completo',
    profileFullNamePlaceholder: 'Seu nome',
    profileLocation: 'Localidade',
    profileLocationPlaceholder: 'Cidade, Estado',
    profileBio: 'Mini bio',
    profileBioPlaceholder: 'Conte um pouco sobre você...',
    profileSkillsTitle: 'Habilidades e Interesses',
    profileSkillsDescription: 'Selecione ou crie tags que representam suas habilidades',
    profileCommunitiesTitle: 'Grupos e Comunidades',
    profileCommunitiesDescription: 'Selecione comunidades das quais você faz parte',
    profileCreateSkill: 'Criar nova habilidade...',
    profileCreateCommunity: 'Criar nova comunidade...',
    profileSaveProfile: 'Salvar Perfil',
    profileSaveError: 'Erro ao salvar',
    profileSaved: 'Perfil salvo!',
    profileTagAdded: 'Tag adicionada!',
    profileTagRemoved: 'Tag removida!',
    profileTagCreatedAdded: 'Tag criada e adicionada!',
    profileNotFound: 'Perfil não encontrado',
    profileFollow: 'Seguir',
    profileUnfollow: 'Deixar de seguir',
    profileFollowing: 'Seguindo!',
    profileUnfollowed: 'Deixou de seguir',
    profileFollowers: 'Seguidores',
    profileFollowingLabel: 'Seguindo',
    profileAvatarInvalidType: 'Tipo de arquivo inválido. Use uma imagem.',
    profileAvatarTooLarge: 'Imagem muito grande. Máximo 2MB.',
    profileAvatarUpdated: 'Foto atualizada!',
    profileAvatarError: 'Erro ao atualizar foto',
    profileAvatarHint: 'Clique para alterar a foto',
    
    // Tags Manager
    tagsManageTitle: 'Gerenciar Tags',
    tagsSkillsTitle: 'Habilidades e Interesses',
    tagsCommunitiesTitle: 'Grupos e Comunidades',
    tagsAvailable: 'tags disponíveis',
    tagsSkillName: 'Nome da habilidade...',
    tagsCommunityName: 'Nome da comunidade...',
    tagsNoSkills: 'Nenhuma habilidade cadastrada ainda.',
    tagsNoCommunities: 'Nenhuma comunidade cadastrada ainda.',
    tagsSkillCreated: 'Habilidade criada!',
    tagsCommunityCreated: 'Comunidade criada!',
    tagsCreateError: 'Erro',
    tagsExistsOrError: 'Tag já existe ou erro ao criar.',
    tagDetails: 'Detalhes da Tag',
    tagDeleted: 'Tag excluída!',
    createdBy: 'Criado por',
    relatedTasks: 'Tarefas relacionadas',
    noRelatedTasks: 'Nenhuma tarefa relacionada',
    relatedProfiles: 'Perfis relacionados',
    noRelatedProfiles: 'Nenhum perfil relacionado',
    taskOpen: 'Aberta',
    tagDuplicate: 'Já existe uma tag com esse nome',
    createNewTag: 'Criar nova tag',
    similarTagsFound: 'Tags similares encontradas',
    exactMatch: 'Correspondência exata',
    tagAlreadyExists: 'Tag já existe',
    clickToSelect: 'Clique para selecionar',
    
    // Admin Page
    adminPanel: 'Painel de Administração',
    adminUsers: 'Usuários',
    adminTranslations: 'Traduções de Tags',
    makeAdmin: 'Tornar Admin',
    searchTags: 'Buscar tags...',
    selectTag: 'Selecione uma tag',
    translations: 'traduções',
    translationsFor: 'Traduções para',
    addTranslation: 'Adicionar Tradução',
    language: 'Idioma',
    selectLanguage: 'Selecione o idioma',
    translatedName: 'Nome traduzido',
    translatedNamePlaceholder: 'Digite a tradução...',
    selectTagToTranslate: 'Selecione uma tag para traduzir',
    
    // Dashboard Page
    dashboardHello: 'Olá',
    dashboardWelcomeMessage: 'Encontre tarefas que combinam com suas habilidades e interesses.',
    dashboardRecommendedTitle: 'Recomendadas',
    dashboardRecommendedSubtitle: 'Tarefas que combinam com seu perfil',
    dashboardMyTasksTitle: 'Minhas Tarefas',
    dashboardMyTasksSubtitle: 'Tarefas que você criou',
    dashboardCompletedTitle: 'Concluídas',
    dashboardAllTasksTitle: 'Todas as Tarefas',
    dashboardAllTasksSubtitle: 'Explore todas as tarefas disponíveis',
    dashboardCreateTask: 'Criar Tarefa',
    dashboardCreateTags: 'Criar Tags',
    dashboardEditProfile: 'Editar Perfil',
    dashboardReport: 'Relatório',
    dashboardManageTags: 'Gerenciar Tags',
    dashboardRecommended: 'Recomendadas',
    dashboardMyTasks: 'Minhas Tarefas',
    dashboardCompleted: 'Concluídas',
    dashboardNoRecommendations: 'Nenhuma recomendação',
    dashboardNoMyTasks: 'Você ainda não criou nenhuma tarefa.',
    dashboardNoTasksCreated: 'Nenhuma tarefa criada',
    dashboardNoCompletedTasks: 'Nenhuma tarefa concluída',
    dashboardNoTasks: 'Nenhuma tarefa encontrada.',
    dashboardConfigureProfile: 'Configure seu perfil',
    dashboardConfigureProfileMessage: 'Adicione habilidades e comunidades ao seu perfil para receber recomendações personalizadas.',
    dashboardNoMatchingTasks: 'Não encontramos tarefas que combinem com suas tags no momento.',
    dashboardCreateFirstTask: 'Crie sua primeira tarefa para começar a colaborar.',
    dashboardCompletedTasksAppear: 'Suas tarefas concluídas aparecerão aqui.',
    dashboardPersonalReport: 'Relatório Pessoal',
    dashboardCompletedCount: 'Você completou',
    dashboardKeepGoing: 'tarefa(s). Continue assim!',
    dashboardTaskCreated: 'Tarefa criada com sucesso!',
    dashboardTaskUpdated: 'Tarefa atualizada!',
    dashboardTaskDeleted: 'Tarefa excluída!',
    dashboardFollowingTasks: 'De quem você segue',
    noFollowers: 'Nenhum seguidor ainda',
    noFollowing: 'Você ainda não segue ninguém',
    
    // Activity
    taskStatistics: 'Estatísticas de Tarefas',
    tasksCreated: 'Tarefas criadas',
    tasksCompleted: 'Tarefas concluídas',
    recentActivity: 'Atividade Recente',
    createdTask: 'Criou a tarefa',
    completedTask: 'Concluiu a tarefa',
    joinedTask: 'Participou da tarefa',
    
    // User Search
    searchUsers: 'Buscar Usuários',
    searchUsersDescription: 'Encontre pessoas por nome, habilidades ou comunidades',
    searchPlaceholder: 'Buscar por nome, habilidade ou comunidade...',
    filterAll: 'Todos',
    filterSkills: 'Habilidades',
    filterCommunities: 'Comunidades',
    recommendedForYou: 'Recomendados para você',
    searchResults: 'Resultados',
    allUsers: 'Todos os usuários',
    noUsersFound: 'Nenhum usuário encontrado',
    compatibility: 'compatibilidade',
    
    // Activity Feed
    activityFeedTitle: 'Feed de Atividades',
    activityCreatedTask: 'criou uma tarefa',
    activityCompletedTask: 'concluiu uma tarefa',
    activityJoinedTask: 'entrou em uma tarefa',
    activityStartedFollowing: 'começou a seguir',
    activityNoFollowing: 'Você não segue ninguém',
    activityNoFollowingDescription: 'Siga pessoas para ver suas atividades aqui.',
    activityEmpty: 'Nenhuma atividade recente',
    activityEmptyDescription: 'As atividades de quem você segue aparecerão aqui.',
    activityFeed: 'Feed',
    
    // Notification Settings
    notificationSettings: 'Configurações de Notificação',
    notificationSettingsSaved: 'Configurações salvas!',
    notificationPermissionDenied: 'Permissão de notificação negada',
    emailNotifications: 'Notificações por Email',
    emailNotificationsDescription: 'Receba notificações importantes por email',
    emailAddress: 'Endereço de Email',
    emailPlaceholder: 'seu@email.com',
    emailOptional: 'Deixe em branco para usar o email da sua conta',
    pushNotifications: 'Notificações Push',
    pushNotificationsDescription: 'Receba notificações no navegador e celular',
    pushNotificationsNotSupported: 'Notificações push não são suportadas neste navegador',
    pushNotificationsBlocked: 'Notificações push estão bloqueadas. Ative nas configurações do navegador.',
    
    // Language
    languageSelect: 'Idioma',
    languagePortuguese: 'Português',
    languageEnglish: 'English',
    
    // Reputation & Testimonials
    reputation: 'Reputação',
    ratingsReceived: 'avaliações recebidas',
    noRatingsYet: 'Ainda sem avaliações',
    commonTags: 'Tags em Comum',
    testimonials: 'Depoimentos',
    writeTestimonial: 'Escreva um depoimento...',
    addTagsToTestimonial: 'Adicione tags ao depoimento:',
    testimonialAdded: 'Depoimento adicionado!',
    testimonialDeleted: 'Depoimento excluído!',
    hideTags: 'Ocultar tags',
    addTags: 'Adicionar tags',
    send: 'Enviar',
    noTestimonialsYet: 'Nenhum depoimento ainda',
    
    // Task Rating
    rateCollaborators: 'Avaliar colaboradores',
    rateTaskOwner: 'Avaliar criador',
    yourRating: 'Sua avaliação',
    ratingSubmitted: 'Avaliação enviada!',
    pendingRatings: 'Avaliações pendentes',
    pendingRatingsCount: 'pessoas para avaliar',
    moreTasks: 'mais tarefas',
    
    // Collaborator Approval
    approve: 'Aprovar',
    reject: 'Rejeitar',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    pending: 'Pendente',
    approveCollaborator: 'Aprovar colaborador',
    rejectCollaborator: 'Rejeitar colaborador',
    collaboratorApproved: 'Colaborador aprovado!',
    collaboratorRejected: 'Colaborador rejeitado',
    allowCollaboration: 'Permitir colaborações',
    allowRequests: 'Permitir solicitações',
    collaborationDisabled: 'Colaborações desativadas',
    requestsDisabled: 'Solicitações desativadas',
    taskSettings: 'Configurações da tarefa',
    settingsSaved: 'Configurações salvas!',
    
    // Report
    averageRating: 'Avaliação média',
    ratings: 'avaliações',
    ratingHistory: 'Histórico de avaliações',
    task: 'Tarefa',
    rater: 'Avaliador',
    rating: 'Avaliação',
    date: 'Data',
    anonymous: 'Anônimo',
  },
  en: {
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    or: 'or',
    user: 'User',
    error: 'Error',
    success: 'Success',
    back: 'Back',
    
    // Hero
    heroSubtitle: 'Nurturing Life',
    heroDescription: 'A task-focused social network where skill matchmaking empowers collaborative and regenerative connections.',
    heroFeatureCollaboration: 'Collaboration',
    heroFeatureMatchmaking: 'Matchmaking',
    heroFeatureRegenerative: 'Regenerative',
    heroStartNow: 'Get Started',
    heroHaveAccount: 'I have an account',
    
    // Auth
    authLogin: 'Login',
    authSignup: 'Sign up',
    authLoginTitle: 'Login',
    authSignupTitle: 'Create account',
    authLoginSubtitle: 'Access your account to continue',
    authSignupSubtitle: 'Join the regenerative community',
    authFullName: 'Full name',
    authFullNamePlaceholder: 'Your name',
    authEmail: 'Email',
    authEmailPlaceholder: 'your@email.com',
    authPassword: 'Password',
    authPasswordPlaceholder: '••••••••',
    authNoAccount: "Don't have an account?",
    authHaveAccount: 'Already have an account?',
    authConnectMetamask: 'Connect MetaMask',
    authWelcomeBack: 'Welcome back!',
    authAccountCreated: 'Account created!',
    authConfigureProfile: 'Configure your profile to get started.',
    authValidationError: 'Validation error',
    authInvalidEmail: 'Invalid email',
    authPasswordMin: 'Password must be at least 6 characters',
    authLoginError: 'Login error',
    authSignupError: 'Signup error',
    authInvalidCredentials: 'Invalid email or password',
    authEmailRegistered: 'This email is already registered',
    authWalletConnected: 'Wallet connected!',
    authWalletError: 'Error connecting wallet',
    authUnexpectedError: 'An unexpected error occurred',
    
    // Dashboard Header
    dashboardConnectWallet: 'Connect Wallet',
    dashboardLogout: 'Logout',
    dashboardLocationNotSet: 'Location not set',
    
    // Notifications
    notificationsTitle: 'Notifications',
    notificationsNew: 'new',
    notificationsMarkAll: 'Mark all',
    notificationsEmpty: 'No notifications',
    
    // Tasks
    taskOffer: 'Offer',
    taskRequest: 'Request',
    taskPersonal: 'Personal',
    taskCreateTitle: 'Create Task',
    taskEditTitle: 'Edit Task',
    taskTypeLabel: 'Task Type',
    taskOfferDescription: 'You have something to offer',
    taskRequestDescription: 'You need help',
    taskPersonalDescription: 'A personal task for yourself',
    taskTitle: 'Title',
    taskTitlePlaceholder: 'Ex: Help with community gardening',
    taskDescription: 'Description',
    taskDescriptionPlaceholder: 'Describe the task details...',
    taskDeadline: 'Deadline',
    taskDeadlineOptional: 'Deadline (optional)',
    taskRelatedSkills: 'Related skills',
    taskCommunities: 'Communities',
    taskChangeType: 'Change type',
    taskCreate: 'Create Task',
    taskCollaborate: 'Collaborate',
    taskRequestAction: 'Request',
    taskCollaborators: 'Collaborators',
    taskRequesters: 'Requesters',
    taskInterestedPeople: 'Interested people',
    taskMarkComplete: 'Mark as Complete',
    taskCompleted: 'Completed',
    taskComments: 'Comments',
    taskAddComment: 'Add comment...',
    taskFeedback: 'Feedback',
    taskAddFeedback: 'Add feedback...',
    taskCompletionProof: 'Completion Proof',
    taskCreatedOn: 'Created on',
    taskDeadlineLabel: 'Deadline',
    taskBlockchainRegistered: 'Registered on Scroll Blockchain',
    taskCollaborationSent: 'Collaboration request sent!',
    taskAlreadyCollaborated: 'You have already requested collaboration on this task.',
    taskRequestSent: 'Request sent!',
    taskAlreadyRequested: 'You have already made a request on this task.',
    taskCommentAdded: 'Comment added!',
    taskFeedbackAdded: 'Feedback added!',
    taskCompletedSuccess: 'Task completed!',
    taskProofRegistered: 'The proof has been successfully registered.',
    taskAddProof: 'Add completion proof',
    taskUploadFile: 'Upload File',
    taskExternalLink: 'External Link',
    taskLinkPlaceholder: 'https://...',
    taskSelectFile: 'Select File (image or PDF)',
    taskFileSelected: 'File selected',
    taskInvalidFileType: 'Invalid file type. Use image or PDF.',
    taskFileTooLarge: 'File too large. Maximum 10MB.',
    taskUploadError: 'Error uploading file',
    taskVoteError: 'Error voting',
    taskYouOfferSomething: 'You have something to offer',
    taskYouNeedHelp: 'You need help',
    taskPersonalNote: 'A personal note or task',
    taskCompleteTitle: 'Complete Task',
    taskCompleteDescription: 'Add a completion proof to register this task on the blockchain.',
    taskSendFeedback: 'Send Feedback',
    taskLeaveFeedback: 'Leave your feedback about this task...',
    taskRemove: 'Remove',
    taskClickToSelect: 'Click to select photo or PDF',
    taskMax10MB: 'Maximum 10MB',
    taskPasteLinkHere: 'Paste the proof link here...',
    taskConfirmCompletion: 'Confirm Completion',
    taskSending: 'Sending...',
    taskRegisteredBlockchain: 'Registered on blockchain. TX:',
    taskEvaluation: 'Task Evaluation',
    
    // Profile
    profileEditTitle: 'Edit Profile',
    profileEditSubtitle: 'Complete your profile to find relevant tasks',
    profileFullName: 'Full name',
    profileFullNamePlaceholder: 'Your name',
    profileLocation: 'Location',
    profileLocationPlaceholder: 'City, State',
    profileBio: 'Mini bio',
    profileBioPlaceholder: 'Tell us a little about yourself...',
    profileSkillsTitle: 'Skills and Interests',
    profileSkillsDescription: 'Select or create tags that represent your skills',
    profileCommunitiesTitle: 'Groups and Communities',
    profileCommunitiesDescription: 'Select communities you are part of',
    profileCreateSkill: 'Create new skill...',
    profileCreateCommunity: 'Create new community...',
    profileSaveProfile: 'Save Profile',
    profileSaveError: 'Error saving',
    profileSaved: 'Profile saved!',
    profileTagAdded: 'Tag added!',
    profileTagRemoved: 'Tag removed!',
    profileTagCreatedAdded: 'Tag created and added!',
    profileNotFound: 'Profile not found',
    profileFollow: 'Follow',
    profileUnfollow: 'Unfollow',
    profileFollowing: 'Following!',
    profileUnfollowed: 'Unfollowed',
    profileFollowers: 'Followers',
    profileFollowingLabel: 'Following',
    profileAvatarInvalidType: 'Invalid file type. Use an image.',
    profileAvatarTooLarge: 'Image too large. Maximum 2MB.',
    profileAvatarUpdated: 'Photo updated!',
    profileAvatarError: 'Error updating photo',
    profileAvatarHint: 'Click to change photo',
    
    // Tags Manager
    tagsManageTitle: 'Manage Tags',
    tagsSkillsTitle: 'Skills and Interests',
    tagsCommunitiesTitle: 'Groups and Communities',
    tagsAvailable: 'tags available',
    tagsSkillName: 'Skill name...',
    tagsCommunityName: 'Community name...',
    tagsNoSkills: 'No skills registered yet.',
    tagsNoCommunities: 'No communities registered yet.',
    tagsSkillCreated: 'Skill created!',
    tagsCommunityCreated: 'Community created!',
    tagsCreateError: 'Error',
    tagsExistsOrError: 'Tag already exists or error creating.',
    tagDetails: 'Tag Details',
    tagDeleted: 'Tag deleted!',
    createdBy: 'Created by',
    relatedTasks: 'Related tasks',
    noRelatedTasks: 'No related tasks',
    relatedProfiles: 'Related profiles',
    noRelatedProfiles: 'No related profiles',
    taskOpen: 'Open',
    tagDuplicate: 'A tag with this name already exists',
    createNewTag: 'Create new tag',
    similarTagsFound: 'Similar tags found',
    exactMatch: 'Exact match',
    tagAlreadyExists: 'Tag already exists',
    clickToSelect: 'Click to select',
    
    // Admin Page
    adminPanel: 'Admin Panel',
    adminUsers: 'Users',
    adminTranslations: 'Tag Translations',
    makeAdmin: 'Make Admin',
    searchTags: 'Search tags...',
    selectTag: 'Select a tag',
    translations: 'translations',
    translationsFor: 'Translations for',
    addTranslation: 'Add Translation',
    language: 'Language',
    selectLanguage: 'Select language',
    translatedName: 'Translated name',
    translatedNamePlaceholder: 'Enter translation...',
    selectTagToTranslate: 'Select a tag to translate',
    
    // Dashboard Page
    dashboardHello: 'Hello',
    dashboardWelcomeMessage: 'Find tasks that match your skills and interests.',
    dashboardRecommendedTitle: 'Recommendations',
    dashboardRecommendedSubtitle: 'Tasks that match your profile',
    dashboardMyTasksTitle: 'My Tasks',
    dashboardMyTasksSubtitle: 'Tasks you created',
    dashboardCompletedTitle: 'Completed',
    dashboardAllTasksTitle: 'All Tasks',
    dashboardAllTasksSubtitle: 'Explore all available tasks',
    dashboardCreateTask: 'Create Task',
    dashboardCreateTags: 'Create Tags',
    dashboardEditProfile: 'Edit Profile',
    dashboardReport: 'Report',
    dashboardManageTags: 'Manage Tags',
    dashboardRecommended: 'Recommendations',
    dashboardMyTasks: 'My Tasks',
    dashboardCompleted: 'Completed',
    dashboardNoRecommendations: 'No recommendations',
    dashboardNoMyTasks: 'You haven\'t created any tasks yet.',
    dashboardNoTasksCreated: 'No tasks created',
    dashboardNoCompletedTasks: 'No completed tasks',
    dashboardNoTasks: 'No tasks found.',
    dashboardConfigureProfile: 'Configure your profile',
    dashboardConfigureProfileMessage: 'Add skills and communities to your profile to receive personalized recommendations.',
    dashboardNoMatchingTasks: 'We couldn\'t find any tasks matching your tags at the moment.',
    dashboardCreateFirstTask: 'Create your first task to start collaborating.',
    dashboardCompletedTasksAppear: 'Your completed tasks will appear here.',
    dashboardPersonalReport: 'Personal Report',
    dashboardCompletedCount: 'You completed',
    dashboardKeepGoing: 'task(s). Keep it up!',
    dashboardTaskCreated: 'Task created successfully!',
    dashboardTaskUpdated: 'Task updated!',
    dashboardTaskDeleted: 'Task deleted!',
    dashboardFollowingTasks: 'From people you follow',
    noFollowers: 'No followers yet',
    noFollowing: "You're not following anyone yet",
    
    // Activity
    taskStatistics: 'Task Statistics',
    tasksCreated: 'Tasks created',
    tasksCompleted: 'Tasks completed',
    recentActivity: 'Recent Activity',
    createdTask: 'Created task',
    completedTask: 'Completed task',
    joinedTask: 'Joined task',
    
    // User Search
    searchUsers: 'Search Users',
    searchUsersDescription: 'Find people by name, skills or communities',
    searchPlaceholder: 'Search by name, skill or community...',
    filterAll: 'All',
    filterSkills: 'Skills',
    filterCommunities: 'Communities',
    recommendedForYou: 'Recommended for you',
    searchResults: 'Results',
    allUsers: 'All users',
    noUsersFound: 'No users found',
    compatibility: 'compatibility',
    
    // Activity Feed
    activityFeedTitle: 'Activity Feed',
    activityCreatedTask: 'created a task',
    activityCompletedTask: 'completed a task',
    activityJoinedTask: 'joined a task',
    activityStartedFollowing: 'started following',
    activityNoFollowing: "You're not following anyone",
    activityNoFollowingDescription: 'Follow people to see their activities here.',
    activityEmpty: 'No recent activity',
    activityEmptyDescription: 'Activities from people you follow will appear here.',
    activityFeed: 'Feed',
    
    // Notification Settings
    notificationSettings: 'Notification Settings',
    notificationSettingsSaved: 'Settings saved!',
    notificationPermissionDenied: 'Notification permission denied',
    emailNotifications: 'Email Notifications',
    emailNotificationsDescription: 'Receive important notifications by email',
    emailAddress: 'Email Address',
    emailPlaceholder: 'your@email.com',
    emailOptional: 'Leave blank to use your account email',
    pushNotifications: 'Push Notifications',
    pushNotificationsDescription: 'Receive notifications in browser and mobile',
    pushNotificationsNotSupported: 'Push notifications are not supported in this browser',
    pushNotificationsBlocked: 'Push notifications are blocked. Enable in browser settings.',
    
    // Language
    languageSelect: 'Language',
    languagePortuguese: 'Português',
    languageEnglish: 'English',
    
    // Reputation & Testimonials
    reputation: 'Reputation',
    ratingsReceived: 'ratings received',
    noRatingsYet: 'No ratings yet',
    commonTags: 'Common Tags',
    testimonials: 'Testimonials',
    writeTestimonial: 'Write a testimonial...',
    addTagsToTestimonial: 'Add tags to testimonial:',
    testimonialAdded: 'Testimonial added!',
    testimonialDeleted: 'Testimonial deleted!',
    hideTags: 'Hide tags',
    addTags: 'Add tags',
    send: 'Send',
    noTestimonialsYet: 'No testimonials yet',
    
    // Task Rating
    rateCollaborators: 'Rate collaborators',
    rateTaskOwner: 'Rate creator',
    yourRating: 'Your rating',
    ratingSubmitted: 'Rating submitted!',
    pendingRatings: 'Pending ratings',
    pendingRatingsCount: 'people to rate',
    moreTasks: 'more tasks',
    
    // Collaborator Approval
    approve: 'Approve',
    reject: 'Reject',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    approveCollaborator: 'Approve collaborator',
    rejectCollaborator: 'Reject collaborator',
    collaboratorApproved: 'Collaborator approved!',
    collaboratorRejected: 'Collaborator rejected',
    allowCollaboration: 'Allow collaborations',
    allowRequests: 'Allow requests',
    collaborationDisabled: 'Collaborations disabled',
    requestsDisabled: 'Requests disabled',
    taskSettings: 'Task settings',
    settingsSaved: 'Settings saved!',
    
    // Report
    averageRating: 'Average rating',
    ratings: 'ratings',
    ratingHistory: 'Rating history',
    task: 'Task',
    rater: 'Rater',
    rating: 'Rating',
    date: 'Date',
    anonymous: 'Anonymous',
  },
};
