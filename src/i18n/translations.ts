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
  
  // Landing Page
  landingFeaturesTitle: string;
  landingFeaturesSubtitle: string;
  landingFeatureRecommendationsTitle: string;
  landingFeatureRecommendationsDesc: string;
  landingFeatureSearchTitle: string;
  landingFeatureSearchDesc: string;
  landingFeatureTagsTitle: string;
  landingFeatureTagsDesc: string;
  landingFeatureReputationTitle: string;
  landingFeatureReputationDesc: string;
  landingFeatureBadgesTitle: string;
  landingFeatureBadgesDesc: string;
  landingFeatureNearbyTitle: string;
  landingFeatureNearbyDesc: string;
  landingCTATitle: string;
  landingCTADescription: string;
  landingResearchText: string;
  landingResearchLink: string;
  mockupBadge1Category: string;
  mockupBadge1Name: string;
  mockupBadge2Category: string;
  mockupBadge2Name: string;
  mockupBadge3Category: string;
  mockupBadge3Name: string;
  mockupNearbyTask1: string;
  mockupNearbyTask2: string;
  mockupNearbyCommunity1: string;
  mockupNearbyDistance1: string;
  mockupNearbyDistance2: string;
  mockupNearbyDistance3: string;
  
  // Landing Mockups
  mockupSearchPlaceholder: string;
  mockupTask1Title: string;
  mockupTask1Tags: string;
  mockupTask2Title: string;
  mockupTask2Tags: string;
  mockupTask3Title: string;
  mockupTask3Tags: string;
  mockupUser1Name: string;
  mockupUser1Location: string;
  mockupUser2Name: string;
  mockupUser2Location: string;
  mockupUser3Name: string;
  mockupUser3Location: string;
  mockupSkill1: string;
  mockupSkill2: string;
  mockupSkill3: string;
  mockupSkill4: string;
  mockupSkill5: string;
  mockupCommunity1: string;
  mockupCommunity2: string;
  mockupCommunity3: string;
  mockupProfileName: string;
  mockupProfileLocation: string;
  mockupTestimonialText: string;
  mockupTestimonialAuthor: string;
  
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
  authContinueWithGoogle: string;
  authForgotPassword: string;
  authForgotPasswordTitle: string;
  authForgotPasswordSubtitle: string;
  authSendResetLink: string;
  authBackToLogin: string;
  authResetEmailSent: string;
  authResetEmailSentDescription: string;
  authPasswordsNotMatch: string;
  authPasswordUpdated: string;
  authPasswordUpdatedDescription: string;
  authInvalidResetLink: string;
  authInvalidResetLinkDescription: string;
  authRedirectingToDashboard: string;
  authCreateNewPassword: string;
  authCreateNewPasswordSubtitle: string;
  authNewPassword: string;
  authNewPasswordPlaceholder: string;
  authConfirmPassword: string;
  authConfirmPasswordPlaceholder: string;
  authUpdatePassword: string;
  authNurtureLifeTitle: string;
  authNurtureLifeDescription: string;
  authNurtureLifeRejected: string;
  authAgreementRequired: string;
  authAgreementRequiredDescription: string;
  yes: string;
  no: string;
  
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
  taskPdfProof: string;
  viewDocument: string;
  taskCreatedOn: string;
  taskDeadlineLabel: string;
  taskBlockchainRegistered: string;
  taskCollaborationSent: string;
  taskAlreadyCollaborated: string;
  taskRequestSent: string;
  taskAlreadyRequested: string;
  taskCancelCollaboration: string;
  taskCancelRequest: string;
  taskCollaborationCanceled: string;
  taskRequestCanceled: string;
  taskYouAreCollaborating: string;
  taskYouRequested: string;
  cancelCollaborationTitle: string;
  cancelCollaborationDescription: string;
  cancelRequestTitle: string;
  cancelRequestDescription: string;
  confirmCancel: string;
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
  taskLocation: string;
  taskLocationPlaceholder: string;
  
  // Location
  locationPlaceholder: string;
  useCurrentLocation: string;
  nearYou: string;
  nearYouDescription: string;
  noNearbyTasks: string;
  noNearbyPeople: string;
  addLocationWarning: string;
  nearbyMapTitle: string;


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
  profileSkillsAndCommunities: string;
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
  blockUser: string;
  unblockUser: string;
  blockConfirmTitle: string;
  blockConfirmMessage: string;
  blockSuccess: string;
  unblockSuccess: string;
  profileBlockedMessage: string;
  confirm: string;
  
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
  removeUser: string;
  removeUserConfirm: string;
  userRemoved: string;
  cannotRemoveSelf: string;
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
  editTag: string;
  editTagName: string;
  editTagCategory: string;
  tagUpdated: string;
  saveTag: string;
  profileSkills: string;
  profileCommunities: string;
  
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
  myPublicProfile: string;
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
  activityCollaboratorCompleted: string;
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
  
  // PWA Install
  installApp: string;
  installDescription: string;
  appInstalled: string;
  openApp: string;
  installNow: string;
  iosInstallInstructions: string;
  iosStep1: string;
  iosStep2: string;
  iosStep3: string;
  installInstructions: string;
  chromeInstall: string;
  edgeInstall: string;
  firefoxInstall: string;
  offlineAccess: string;
  fastLoading: string;
  addToHomeScreen: string;
  addToHomeScreenManual: string;
  
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
  
  // Task Settings Extended
  autoApproveCollaborators: string;
  autoApproveCollaboratorsDesc: string;
  autoApproveRequesters: string;
  autoApproveRequestersDesc: string;
  limitParticipants: string;
  maxCollaborators: string;
  maxRequesters: string;
  repeatTask: string;
  repeatNever: string;
  repeatDaily: string;
  repeatWeekly: string;
  repeatMonthly: string;
  repeatYearly: string;
  repeatCustom: string;
  repeatTimesPerWeek: string;
  repeatTimesPerMonth: string;
  repeatTimesPerYear: string;
  repeatDaysOfWeek: string;
  repeatEndDate: string;
  repeatEndOccurrences: string;
  repeatEndsAfter: string;
  repeatEndsOn: string;
  repeatOccurrences: string;
  enableStreak: string;
  enableStreakDesc: string;
  taskSettingsCollapsible: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  
  // Task History & Delete
  taskDeleteConfirm: string;
  taskDeleteConfirmDescription: string;
  taskDeleteSuccess: string;
  taskDeleteError: string;
  taskHistory: string;
  taskHistoryEmpty: string;
  taskHistoryCreated: string;
  taskHistoryUpdated: string;
  taskHistoryDeleted: string;
  taskHistoryCompleted: string;
  taskHistoryField: string;
  taskHistoryFrom: string;
  taskHistoryTo: string;
  confirmDelete: string;
  
  // Social Links
  socialLinks: string;
  socialLinksDescription: string;
  contactMethods: string;
  contactMethodsDescription: string;
  
  // Task Image & Completion
  taskImage: string;
  taskImageOptional: string;
  taskSelectImage: string;
  taskImageSelected: string;
  taskMarkAsCompleted: string;
  taskMarkAsCompletedDescription: string;
  
  // Priority
  taskPriority: string;
  taskPriorityOptional: string;
  taskPriorityLow: string;
  taskPriorityMedium: string;
  taskPriorityHigh: string;
  taskHighPriority: string;
  
  // Completion Flow
  taskProofSubmitted: string;
  taskProofSubmittedDescription: string;
  taskPendingConfirmation: string;
  taskConfirmCompletionAction: string;
  taskSubmitProof: string;
  
  // Rating Modal
  rateUser: string;
  rateUserDescription: string;
  selectRating: string;
  star: string;
  stars: string;
  ratingCommentOptional: string;
  ratingCommentRequired: string;
  ratingCommentRequiredHelp: string;
  ratingCommentPlaceholder: string;
  ratingComment: string;
  sending: string;
  submitRating: string;
  
  // PWA Update
  newVersionAvailable: string;
  updateNow: string;
  
  // Navigation
  dashboard: string;
  
  // Quiz
  quizTitle: string;
  quizDescription: string;
  quizQuestion: string;
  of: string;
  quizQ1Title: string;
  quizQ1Subtitle: string;
  quizQ2Title: string;
  quizQ2Subtitle: string;
  quizQ3Title: string;
  quizQ3Subtitle: string;
  quizQ4Title: string;
  quizQ4Subtitle: string;
  quizQ5Title: string;
  quizQ5Subtitle: string;
  quizQ6Title: string;
  quizQ6Subtitle: string;
  quizQ7Title: string;
  quizQ7Subtitle: string;
  quizQ8Title: string;
  quizQ8Subtitle: string;
  quizQ9Title: string;
  quizQ9Subtitle: string;
  quizQ10Title: string;
  quizQ10Subtitle: string;
  quizQ11Title: string;
  quizQ11Subtitle: string;
  quizSuggestedTags: string;
  quizAddCustomTag: string;
  quizTagPlaceholder: string;
  quizSelectedTags: string;
  quizSkip: string;
  quizNext: string;
  quizComplete: string;
  quizCompleted: string;
  quizTagsAdded: string;
  quizCompletionTitle: string;
  quizCompletionMessage: string;
  quizTagsAddedCount: string;
  quizGoToDashboard: string;
  quizGoToProfile: string;
  tagCreated: string;
  quizBannerTitle: string;
  quizBannerDescription: string;
  quizBannerCTA: string;
  quizNotificationMessage: string;
  
  // My Tasks Section
  myTasksSection: string;
  actionPlan: string;
  actionPlanDescription: string;
  noActionPlanTasks: string;
  demands: string;
  demandsDescription: string;
  noDemandsTasks: string;
  impact: string;
  impactDescription: string;
  noImpactTasks: string;
  filterToday: string;
  filterMonth: string;
  filterAllTasks: string;
  filterPersonal: string;
  filterCreator: string;
  filterCollaborator: string;
  filterRequester: string;
  showMore: string;
  showLess: string;
  noTagsFound: string;
  popularTags: string;
  
  // Chat
  chatTitle: string;
  chatBack: string;
  chatNoMessages: string;
  chatNoConversations: string;
  chatInputPlaceholder: string;
  chatUnknownUser: string;
  chatGroupConversation: string;
  chatParticipants: string;
  chatViewTask: string;
  chatYesterday: string;
  chatStartConversation: string;
  chatSelectConversation: string;
  chatUploadError: string;
  chatFileTooLarge: string;
  chatAttachment: string;
  chatDownloadFile: string;
  chatTypingSingle: string;
  chatTypingTwo: string;
  chatTypingMultiple: string;
  chatUserUnknown: string;
  chatSearchMessages: string;
  chatSearchPlaceholder: string;
  chatNoSearchResults: string;
  chatNewConversation: string;
  chatDirectMessage: string;
  chatCreateGroup: string;
  chatGroupName: string;
  chatGroupNamePlaceholder: string;
  chatSelectMembers: string;
  chatMinGroupMembers: string;
  chatSearchUsersPlaceholder: string;
  chatNoUsersFound: string;
  chatTypeToSearch: string;
  chatMembers: string;
  chatYou: string;
  chatAddMember: string;
  chatLeaveGroup: string;
  chatMemberAdded: string;
  chatMemberRemoved: string;
  chatMemberAddError: string;
  chatMemberRemoveError: string;
  chatLeftGroup: string;

  // Badges
  badgesTitle: string;
  badgesSeeAll: string;
  badgesPageTitle: string;
  badgesPageSubtitle: string;
  badgesMyBadges: string;
  badgesNoBadges: string;
  badgesNoBadgesDesc: string;
  badgesLockedLabel: string;
  badgesEarnedAt: string;
  badgesLevel: string;
  badgesLevelSilver: string;
  badgesLevelGold: string;
  badgesLevelDiamond: string;
  badgesCategoryTaskmates: string;
  badgesCategoryHabits: string;
  badgesCategoryCommu: string;
  badgesCategoryLeadership: string;
  badgesCategoryCollab: string;
  badgesCategoryImpact: string;
  badgesCategorySociability: string;
  badgesCategoryReliability: string;
  badgesCategoryConsistency: string;
  badgesDescTaskmates: string;
  badgesDescHabits: string;
  badgesDescCommu: string;
  badgesDescLeadership: string;
  badgesDescCollab: string;
  badgesDescImpact: string;
  badgesDescSociability: string;
  badgesDescReliability: string;
  badgesDescConsistency: string;
  badgesRequirement: string;
  badgesTaskHistory: string;
  badgesNoTaskHistory: string;
  badgesCompletedOn: string;
  badgesFilterAll: string;
  badgesNewBadgeNotif: string;
  badgesLevelUpNotif: string;
  badgesSyncNow: string;
  
  // Polls
  relatedPolls: string;
  noRelatedPolls: string;
  pollsAll: string;
  pollsVoting: string;
  pollsClosed: string;
  pollStatusActive: string;
  pollStatusClosed: string;

  // Verification
  memberSince: string;
  verified: string;
  unverified: string;
  vouch: string;
  vouchUser: string;
  vouchSuccess: string;
  vouchAlready: string;
  vouchSelf: string;
  vouchRequiresVerified: string;
  vouchesReceived: string;
  vouchesNeeded: string;
  noVouchesYet: string;
  verifiedByAdmin: string;
  verifyUser: string;
  verifiedBadge: string;
  unverifiedCannotVote: string;
  verificationStatus: string;
  removeVouch: string;
  vouchRemoved: string;
  adminVerify: string;
  adminUnverify: string;
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
    
    // Landing Page
    landingFeaturesTitle: 'Como o TaskMates funciona',
    landingFeaturesSubtitle: 'Descubra como nossa plataforma conecta pessoas através de habilidades e interesses em comum.',
    landingFeatureRecommendationsTitle: 'Recomendações Personalizadas',
    landingFeatureRecommendationsDesc: 'Receba sugestões de tarefas que combinam com suas habilidades e interesses. Nosso algoritmo analisa suas tags para encontrar as melhores oportunidades.',
    landingFeatureSearchTitle: 'Busca por Compatibilidade',
    landingFeatureSearchDesc: 'Encontre membros com interesses similares aos seus. Veja o percentual de compatibilidade baseado em habilidades e comunidades compartilhadas.',
    landingFeatureTagsTitle: 'Tags de Habilidades e Comunidades',
    landingFeatureTagsDesc: 'Organize e identifique competências e grupos. Use tags para destacar o que você sabe fazer e os círculos dos quais participa.',
    landingFeatureReputationTitle: 'Perfis com Reputação',
    landingFeatureReputationDesc: 'Construa sua reputação através de avaliações e depoimentos. Cada tarefa concluída fortalece sua credibilidade na rede.',
    landingFeatureBadgesTitle: 'Selos e Gamificação',
    landingFeatureBadgesDesc: 'Conquiste selos ao completar tarefas e evoluir na plataforma. Cada categoria tem 12 níveis de progressão que reconhecem suas contribuições.',
    landingFeatureNearbyTitle: 'Perto de Você',
    landingFeatureNearbyDesc: 'Encontre tarefas e comunidades ativas na sua região. Conecte-se com pessoas próximas e fortaleça sua rede local.',
    landingCTATitle: 'Pronto para colaborar?',
    landingCTADescription: 'Junte-se a uma comunidade que valoriza a colaboração e o cuidado mútuo. Comece agora e encontre pessoas que compartilham seus valores.',
    landingResearchText: 'TaskMates faz parte de um projeto de pesquisa em ciências comportamentais que visa investigar se a tecnologia da informação e as tecnologias persuasivas podem ser ferramentas eficazes para apoiar e escalar mudanças comportamentais regenerativas e ajudar as pessoas a se auto-organizarem em torno do bem-estar do todo.',
    landingResearchLink: 'Leia o projeto de pesquisa',
    mockupBadge1Category: 'Colaboração',
    mockupBadge1Name: 'Altruísta Exemplar',
    mockupBadge2Category: 'Hábitos',
    mockupBadge2Name: 'Jardinagem',
    mockupBadge3Category: 'Liderança',
    mockupBadge3Name: 'Mobilizador Social',
    mockupNearbyTask1: 'Mutirão de limpeza no parque',
    mockupNearbyTask2: 'Aula de yoga ao ar livre',
    mockupNearbyCommunity1: 'Horta Comunitária Centro',
    mockupNearbyDistance1: '0,8 km',
    mockupNearbyDistance2: '1,2 km',
    mockupNearbyDistance3: '2,5 km',
    
    // Landing Mockups
    mockupSearchPlaceholder: 'Buscar membros...',
    mockupTask1Title: 'Ajuda com horta comunitária',
    mockupTask1Tags: 'Jardinagem,Sustentabilidade',
    mockupTask2Title: 'Aulas de português',
    mockupTask2Tags: 'Educação,Idiomas',
    mockupTask3Title: 'Reparo de bicicletas',
    mockupTask3Tags: 'Mecânica,Mobilidade',
    mockupUser1Name: 'Ana Silva',
    mockupUser1Location: 'São Paulo, SP',
    mockupUser2Name: 'Carlos Mendes',
    mockupUser2Location: 'Rio de Janeiro, RJ',
    mockupUser3Name: 'Maria Santos',
    mockupUser3Location: 'Belo Horizonte, MG',
    mockupSkill1: 'Programação',
    mockupSkill2: 'Design',
    mockupSkill3: 'Jardinagem',
    mockupSkill4: 'Culinária',
    mockupSkill5: 'Idiomas',
    mockupCommunity1: 'Ecovilas Brasil',
    mockupCommunity2: 'Permacultura SP',
    mockupCommunity3: 'Economia Solidária',
    mockupProfileName: 'João Mendes',
    mockupProfileLocation: 'Campinas, SP',
    mockupTestimonialText: '"Excelente colaborador! Sempre pontual e dedicado nas tarefas."',
    mockupTestimonialAuthor: '— Ana Silva',
    
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
    authContinueWithGoogle: 'Continuar com Google',
    authForgotPassword: 'Esqueceu a senha?',
    authForgotPasswordTitle: 'Recuperar Senha',
    authForgotPasswordSubtitle: 'Digite seu email para receber o link de recuperação',
    authSendResetLink: 'Enviar link de recuperação',
    authBackToLogin: 'Voltar para o login',
    authResetEmailSent: 'Email enviado!',
    authResetEmailSentDescription: 'Verifique sua caixa de entrada para o link de recuperação.',
    authPasswordsNotMatch: 'As senhas não coincidem',
    authPasswordUpdated: 'Senha atualizada!',
    authPasswordUpdatedDescription: 'Sua senha foi atualizada com sucesso.',
    authInvalidResetLink: 'Link inválido ou expirado',
    authInvalidResetLinkDescription: 'O link de recuperação de senha é inválido ou expirou. Por favor, solicite um novo link.',
    authRedirectingToDashboard: 'Redirecionando para o painel...',
    authCreateNewPassword: 'Criar Nova Senha',
    authCreateNewPasswordSubtitle: 'Digite sua nova senha abaixo',
    authNewPassword: 'Nova senha',
    authNewPasswordPlaceholder: 'Digite sua nova senha',
    authConfirmPassword: 'Confirmar senha',
    authConfirmPasswordPlaceholder: 'Confirme sua nova senha',
    authUpdatePassword: 'Atualizar Senha',
    authNurtureLifeTitle: 'Acordo de Nutrir a Vida',
    authNurtureLifeDescription: 'O TaskMates tem como objetivo comum NUTRIR A VIDA, o que inclui ações de autocuidado, ajuda mútua e cuidados socioambientais. Você concorda em colaborar com esses objetivos?',
    authNurtureLifeRejected: 'O TaskMates é reservado para pessoas alinhadas ao objetivo comum de Nutrir a Vida!',
    authAgreementRequired: 'Acordo obrigatório',
    authAgreementRequiredDescription: 'Você precisa concordar com o Acordo de Nutrir a Vida para criar sua conta.',
    yes: 'Sim, concordo',
    no: 'Não concordo',
    
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
    taskPdfProof: 'Documento PDF',
    viewDocument: 'Ver documento',
    taskCreatedOn: 'Criada em',
    taskDeadlineLabel: 'Prazo',
    taskBlockchainRegistered: 'Registrado na Scroll Blockchain',
    taskCollaborationSent: 'Solicitação de colaboração enviada!',
    taskAlreadyCollaborated: 'Você já solicitou colaboração nesta tarefa.',
    taskRequestSent: 'Solicitação enviada!',
    taskAlreadyRequested: 'Você já fez uma solicitação nesta tarefa.',
    taskCancelCollaboration: 'Cancelar colaboração',
    taskCancelRequest: 'Cancelar solicitação',
    taskCollaborationCanceled: 'Colaboração cancelada!',
    taskRequestCanceled: 'Solicitação cancelada!',
    taskYouAreCollaborating: 'Colaborando',
    taskYouRequested: 'Solicitado',
    cancelCollaborationTitle: 'Cancelar Colaboração',
    cancelCollaborationDescription: 'Tem certeza que deseja cancelar sua colaboração nesta tarefa? O dono da tarefa será notificado.',
    cancelRequestTitle: 'Cancelar Solicitação',
    cancelRequestDescription: 'Tem certeza que deseja cancelar sua solicitação nesta tarefa? O dono da tarefa será notificado.',
    confirmCancel: 'Sim, cancelar',
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
    taskLocation: 'Localização da tarefa',
    taskLocationPlaceholder: 'Ex: Rio de Janeiro, RJ',
    
    // Location
    locationPlaceholder: 'Cidade, Estado',
    useCurrentLocation: 'Usar minha localização atual',
    nearYou: 'Perto de você',
    nearYouDescription: 'Tarefas e pessoas na sua cidade',
    noNearbyTasks: 'Nenhuma tarefa na sua cidade',
    noNearbyPeople: 'Nenhuma pessoa na sua cidade ainda',
    addLocationWarning: 'Adicione sua localização no perfil para ver tarefas próximas',
    nearbyMapTitle: 'Atividades Próximas',

    
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
    profileSkillsAndCommunities: 'Habilidades e Comunidades',
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
    blockUser: 'Bloquear usuário',
    unblockUser: 'Desbloquear usuário',
    blockConfirmTitle: 'Bloquear usuário?',
    blockConfirmMessage: 'O usuário bloqueado não poderá ver seu perfil, te seguir ou visualizar suas postagens. Deseja continuar?',
    blockSuccess: 'Usuário bloqueado',
    unblockSuccess: 'Usuário desbloqueado',
    profileBlockedMessage: 'Este perfil não está disponível.',
    confirm: 'Confirmar',
    
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
    removeUser: 'Remover Usuário',
    removeUserConfirm: 'Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.',
    userRemoved: 'Usuário removido com sucesso!',
    cannotRemoveSelf: 'Você não pode remover sua própria conta',
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
    editTag: 'Editar Tag',
    editTagName: 'Nome da Tag',
    editTagCategory: 'Categoria',
    tagUpdated: 'Tag atualizada com sucesso!',
    saveTag: 'Salvar Tag',
    profileSkills: 'Habilidades',
    profileCommunities: 'Comunidades',
    
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
    myPublicProfile: 'Meu Perfil Público',
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
    activityCollaboratorCompleted: 'concluiu como colaborador',
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
    
    // PWA Install
    installApp: 'Instalar App',
    installDescription: 'Instale o app no seu celular para acesso rápido e offline',
    appInstalled: 'App instalado com sucesso!',
    openApp: 'Abrir App',
    installNow: 'Instalar Agora',
    iosInstallInstructions: 'Para instalar no iPhone/iPad, siga os passos abaixo:',
    iosStep1: 'Toque no botão de compartilhar (quadrado com seta)',
    iosStep2: 'Role e toque em "Adicionar à Tela de Início"',
    iosStep3: 'Toque em "Adicionar" para confirmar',
    installInstructions: 'Use o menu do seu navegador para instalar o app:',
    chromeInstall: 'Menu → Instalar app',
    edgeInstall: 'Menu → Apps → Instalar este site como app',
    firefoxInstall: 'Menu → Adicionar à tela inicial',
    offlineAccess: 'Acesso Offline',
    fastLoading: 'Carregamento Rápido',
    addToHomeScreen: 'Adicionar à tela inicial',
    addToHomeScreenManual: 'Use o menu de compartilhar do seu navegador e selecione "Adicionar à tela inicial"',
    
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
    
    // Task History & Delete
    taskDeleteConfirm: 'Excluir tarefa',
    taskDeleteConfirmDescription: 'Tem certeza que deseja excluir esta tarefa? Todos os envolvidos serão notificados.',
    taskDeleteSuccess: 'Tarefa excluída com sucesso!',
    taskDeleteError: 'Erro ao excluir tarefa',
    taskHistory: 'Histórico de alterações',
    taskHistoryEmpty: 'Nenhuma alteração registrada',
    taskHistoryCreated: 'criou a tarefa',
    taskHistoryUpdated: 'atualizou',
    taskHistoryDeleted: 'excluiu a tarefa',
    taskHistoryCompleted: 'concluiu a tarefa',
    taskHistoryField: 'campo',
    taskHistoryFrom: 'de',
    taskHistoryTo: 'para',
    confirmDelete: 'Confirmar exclusão',
    
    // Social Links & Contact
    socialLinks: 'Redes Sociais',
    socialLinksDescription: 'Adicione links para seus perfis em redes sociais',
    contactMethods: 'Meios de Contato',
    contactMethodsDescription: 'Adicione opcionalmente formas de contato direto',
    
    // Report
    averageRating: 'Avaliação média',
    ratings: 'avaliações',
    ratingHistory: 'Histórico de avaliações',
    task: 'Tarefa',
    rater: 'Avaliador',
    rating: 'Avaliação',
    date: 'Data',
    anonymous: 'Anônimo',
    
    // Task Image & Completion
    taskImage: 'Imagem da tarefa',
    taskImageOptional: 'Imagem (opcional)',
    taskSelectImage: 'Selecionar imagem',
    taskImageSelected: 'Imagem selecionada',
    taskMarkAsCompleted: 'Marcar como concluída',
    taskMarkAsCompletedDescription: 'Ao marcar, você será solicitado a adicionar uma prova de conclusão',
    
    // Priority
    taskPriority: 'Prioridade',
    taskPriorityOptional: 'Prioridade (opcional)',
    taskPriorityLow: 'Baixa',
    taskPriorityMedium: 'Média',
    taskPriorityHigh: 'Alta',
    taskHighPriority: 'Alta prioridade',
    
    // Completion Flow
    taskProofSubmitted: 'Prova enviada!',
    taskProofSubmittedDescription: 'O criador da tarefa será notificado para confirmar a conclusão.',
    taskPendingConfirmation: 'Aguardando confirmação do criador',
    taskConfirmCompletionAction: 'Confirmar conclusão',
    taskSubmitProof: 'Enviar prova',
    
    // Rating Modal
    rateUser: 'Avaliar usuário',
    rateUserDescription: 'Deixe sua avaliação sobre a participação nesta tarefa.',
    selectRating: 'Clique para avaliar',
    star: 'estrela',
    stars: 'estrelas',
    ratingCommentOptional: 'Comentário (opcional)',
    ratingCommentRequired: 'Comentário (obrigatório)',
    ratingCommentRequiredHelp: 'Para avaliações de 3 estrelas ou menos, o comentário é obrigatório para ajudar a melhorar a performance.',
    ratingCommentPlaceholder: 'Conte mais sobre sua experiência...',
    ratingComment: 'Comentário',
    sending: 'Enviando...',
    submitRating: 'Enviar avaliação',
    
    // PWA Update
    newVersionAvailable: 'Nova versão disponível!',
    updateNow: 'Atualizar agora',
    
    // Navigation
    dashboard: 'Início',
    
    // Quiz
    quizTitle: 'Quiz de Potencialidades',
    quizDescription: 'Descubra e adicione suas habilidades e comunidades ao perfil',
    quizQuestion: 'Pergunta',
    of: 'de',
    quizQ1Title: 'Em uma força-tarefa comunitária, em quais ações você tem mais interesse em contribuir?',
    quizQ1Subtitle: 'Qual tipo de mutirão você acha mais importante e ficaria mais feliz em participar...',
    quizQ2Title: 'O que você ama fazer e o que sua alma te impulsiona a criar? 💚',
    quizQ2Subtitle: 'Aquilo que te faz perder a noção do tempo e te energiza em vez de te cansar...',
    quizQ3Title: 'Se você pudesse ajudar seus vizinhos de um jeito hoje, seria... 🤝',
    quizQ3Subtitle: 'Não precisa ser grande. Pequenos gestos transformam o mundo.',
    quizQ4Title: 'Qual habilidade você tem que as pessoas sempre pedem sua ajuda? ⭐',
    quizQ4Subtitle: 'Sabe aquela coisa que é fácil pra você mas parece mágica pros outros?',
    quizQ5Title: 'O que você sempre quis aprender mas nunca teve tempo? 🌱',
    quizQ5Subtitle: 'Agora é a hora! Declarar sua intenção é o primeiro passo.',
    quizQ6Title: 'Quando você era criança, do que mais gostava de brincar? 🎈',
    quizQ6Subtitle: 'Nossas primeiras paixões revelam nossos dons naturais.',
    quizQ7Title: 'Se você tivesse uma tarde livre, como gostaria de usá-la para deixar o mundo um pouquinho melhor? 🌍',
    quizQ7Subtitle: 'O que seu coração te chama a curar e regenerar?',
    quizQ8Title: 'Durante o trabalho em grupo, você foca em…',
    quizQ8Subtitle: 'Como você se vê no seu melhor?',
    quizQ9Title: 'Em qual ambiente você se sente mais vivo? 🌈',
    quizQ9Subtitle: 'Onde sua energia flui naturalmente?',
    quizQ10Title: 'Como você prefere contribuir em um projeto comunitário? 🤝',
    quizQ10Subtitle: 'Todos temos um jeito único de somar!',
    quizQ11Title: 'Se você pudesse criar um hábito regenerativo agora, qual seria? 🌿',
    quizQ11Subtitle: 'Começar é o superpoder mais subestimado!',
    quizSuggestedTags: 'Tags sugeridas:',
    quizAddCustomTag: 'Adicionar tag personalizada:',
    quizTagPlaceholder: 'Digite o nome da tag...',
    quizSelectedTags: 'Tags selecionadas',
    quizSkip: 'Pular quiz',
    quizNext: 'Próxima',
    quizComplete: 'Concluir',
    quizCompleted: 'Quiz concluído!',
    quizTagsAdded: '{count} tags foram adicionadas ao seu perfil.',
    quizCompletionTitle: 'Parabéns! 🎉',
    quizCompletionMessage: 'Você completou o Quiz de Potencialidades! Suas novas tags vão ajudar a encontrar as melhores conexões e tarefas para você.',
    quizTagsAddedCount: 'tags adicionadas ao seu perfil',
    quizGoToDashboard: 'Ir para o Dashboard',
    quizGoToProfile: 'Editar Perfil',
    tagCreated: 'Tag criada com sucesso!',
    quizBannerTitle: 'Descubra suas potencialidades!',
    quizBannerDescription: 'Faça nosso quiz rápido para adicionar mais tags ao seu perfil e melhorar suas chances de matchmaking.',
    quizBannerCTA: 'Fazer Quiz',
    quizNotificationMessage: 'Complete o Quiz de Potencialidades para melhorar seu perfil e receber melhores recomendações!',
    
    // My Tasks Section
    myTasksSection: 'Minhas Tarefas',
    actionPlan: 'Plano de Ação',
    actionPlanDescription: 'Suas ofertas, tarefas pessoais e colaborações ativas',
    noActionPlanTasks: 'Nenhuma tarefa no plano de ação',
    demands: 'Demandas',
    demandsDescription: 'Suas solicitações e tarefas que você está aguardando',
    noDemandsTasks: 'Nenhuma demanda encontrada',
    impact: 'Impacto',
    impactDescription: 'Tarefas concluídas que você participou',
    noImpactTasks: 'Nenhuma tarefa concluída encontrada',
    filterToday: 'Hoje',
    filterMonth: 'Este mês',
    filterAllTasks: 'Todas',
    filterPersonal: 'Pessoais',
    filterCreator: 'Idealizador',
    filterCollaborator: 'Colaborador',
    filterRequester: 'Solicitador',
    showMore: 'Ver mais',
    showLess: 'Ver menos',
    noTagsFound: 'Nenhuma tag encontrada',
    popularTags: 'Tags populares',
    
    // Chat
    chatTitle: 'Conversas',
    chatBack: 'Voltar',
    chatNoMessages: 'Nenhuma mensagem ainda. Inicie a conversa!',
    chatNoConversations: 'Nenhuma conversa ainda',
    chatInputPlaceholder: 'Digite uma mensagem...',
    chatUnknownUser: 'Usuário',
    chatGroupConversation: 'Conversa em grupo',
    chatParticipants: 'participantes',
    chatViewTask: 'Ver tarefa',
    chatYesterday: 'Ontem',
    chatStartConversation: 'Iniciar conversa',
    chatSelectConversation: 'Selecione uma conversa para começar',
    chatUploadError: 'Erro ao enviar arquivo',
    chatFileTooLarge: 'Arquivo muito grande (máx. 10MB)',
    chatAttachment: 'Anexo',
    chatDownloadFile: 'Baixar arquivo',
    chatTypingSingle: '{name} está digitando...',
    chatTypingTwo: '{name1} e {name2} estão digitando...',
    chatTypingMultiple: 'Várias pessoas estão digitando...',
    chatUserUnknown: 'Alguém',
    chatSearchMessages: 'Buscar mensagens',
    chatSearchPlaceholder: 'Buscar na conversa...',
    chatNoSearchResults: 'Nenhuma mensagem encontrada',
    chatNewConversation: 'Nova conversa',
    chatDirectMessage: 'Mensagem direta',
    chatCreateGroup: 'Criar grupo',
    chatGroupName: 'Nome do grupo',
    chatGroupNamePlaceholder: 'Ex: Projeto Horta Comunitária',
    chatSelectMembers: 'Selecione os membros',
    chatMinGroupMembers: 'Selecione ao menos 2 membros',
    chatSearchUsersPlaceholder: 'Buscar usuários pelo nome...',
    chatNoUsersFound: 'Nenhum usuário encontrado',
    chatTypeToSearch: 'Digite ao menos 2 caracteres para buscar',
    chatMembers: 'Membros',
    chatYou: 'Você',
    chatAddMember: 'Adicionar membro',
    chatLeaveGroup: 'Sair do grupo',
    chatMemberAdded: 'Membro adicionado',
    chatMemberRemoved: 'Membro removido',
    chatMemberAddError: 'Erro ao adicionar membro',
    chatMemberRemoveError: 'Erro ao remover membro',
    chatLeftGroup: 'Você saiu do grupo',
    
    // Task Settings Extended
    autoApproveCollaborators: 'Aprovar colaboradores automaticamente',
    autoApproveCollaboratorsDesc: 'Novos colaboradores são aprovados e adicionados ao chat automaticamente',
    autoApproveRequesters: 'Aprovar solicitantes automaticamente',
    autoApproveRequestersDesc: 'Novos solicitantes são aprovados e adicionados ao chat automaticamente',
    limitParticipants: 'Limitar participantes',
    maxCollaborators: 'Máx. colaboradores',
    maxRequesters: 'Máx. solicitantes',
    repeatTask: 'Repetir tarefa',
    repeatNever: 'Não repetir',
    repeatDaily: 'Diariamente',
    repeatWeekly: 'Semanalmente',
    repeatMonthly: 'Mensalmente',
    repeatYearly: 'Anualmente',
    repeatCustom: 'Personalizado',
    repeatTimesPerWeek: 'vez(es) por semana',
    repeatTimesPerMonth: 'vez(es) por mês',
    repeatTimesPerYear: 'vez(es) por ano',
    repeatDaysOfWeek: 'Dias da semana',
    repeatEndDate: 'Data de término',
    repeatEndOccurrences: 'Número de ocorrências',
    repeatEndsAfter: 'Termina após',
    repeatEndsOn: 'Termina em',
    repeatOccurrences: 'ocorrências',
    enableStreak: 'Contabilizar Streak',
    enableStreakDesc: 'Conta quantas vezes a tarefa foi concluída na data determinada (atraso não contabiliza)',
    taskSettingsCollapsible: 'Configurações da tarefa',
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',

    // Badges
    badgesTitle: 'Selos de Habilidades',
    badgesSeeAll: 'Ver todos',
    badgesPageTitle: 'Meus Selos de Habilidades',
    badgesPageSubtitle: 'Conquistas obtidas pela sua participação e contribuições',
    badgesMyBadges: 'Selos conquistados',
    badgesNoBadges: 'Nenhum selo ainda',
    badgesNoBadgesDesc: 'Complete tarefas para começar a conquistar selos!',
    badgesLockedLabel: 'Bloqueado',
    badgesEarnedAt: 'Conquistado em',
    badgesLevel: 'Nível',
    badgesLevelSilver: 'Prata',
    badgesLevelGold: 'Ouro',
    badgesLevelDiamond: 'Diamante',
    badgesCategoryTaskmates: 'Taskmates',
    badgesCategoryHabits: 'Hábitos',
    badgesCategoryCommu: 'Comunidades',
    badgesCategoryLeadership: 'Liderança',
    badgesCategoryCollab: 'Colaboração',
    badgesCategoryImpact: 'Impacto Positivo',
    badgesCategorySociability: 'Sociabilidade',
    badgesCategoryReliability: 'Confiabilidade',
    badgesCategoryConsistency: 'Consistência',
    badgesDescTaskmates: 'Indica seus maiores parceiros de equipe. Desbloqueado ao concluir tarefas juntos.',
    badgesDescHabits: 'Indica seus comportamentos-alvo. Desbloqueado ao concluir tarefas com a mesma tag de habilidade.',
    badgesDescCommu: 'Indica as comunidades em que você é mais ativo. Desbloqueado ao concluir tarefas com a mesma tag de comunidade.',
    badgesDescLeadership: 'Indica sua capacidade de mobilizar pessoas. Desbloqueado ao reunir colaboradores e solicitadores em uma tarefa sua.',
    badgesDescCollab: 'Indica seu companheirismo. Desbloqueado ao concluir tarefas como colaborador de outras pessoas.',
    badgesDescImpact: 'Indica o reconhecimento das suas tarefas. Desbloqueado ao acumular likes em uma mesma tarefa concluída.',
    badgesDescSociability: 'Indica sua capacidade de construir redes. Desbloqueado ao acumular seguidores.',
    badgesDescReliability: 'Indica sua integridade e alto nível de execução. Desbloqueado ao receber avaliações máximas consecutivas.',
    badgesDescConsistency: 'Indica seu comprometimento pessoal. Desbloqueado ao acumular streaks em tarefas repetidas.',
    badgesRequirement: 'Requisito',
    badgesTaskHistory: 'Histórico de tarefas do selo',
    badgesNoTaskHistory: 'Nenhuma tarefa encontrada para este selo.',
    badgesCompletedOn: 'Concluída em',
    badgesFilterAll: 'Todos',
    badgesNewBadgeNotif: '🏅 Você conquistou um novo selo!',
    badgesLevelUpNotif: '⬆️ Seu selo subiu de nível!',
    badgesSyncNow: 'Sincronizar selos',
    
    // Polls
    relatedPolls: 'Enquetes relacionadas',
    noRelatedPolls: 'Nenhuma enquete relacionada',
    pollsAll: 'Todas',
    pollsVoting: 'Em votação',
    pollsClosed: 'Concluídas',
    pollStatusActive: 'Em votação',
    pollStatusClosed: 'Concluída',

    // Verification
    memberSince: 'Membro desde',
    verified: 'Verificado',
    unverified: 'Não verificado',
    vouch: 'Atestar',
    vouchUser: 'Atestar usuário',
    vouchSuccess: 'Vouch registrado com sucesso!',
    vouchAlready: 'Você já atestou este usuário',
    vouchSelf: 'Você não pode atestar a si mesmo',
    vouchRequiresVerified: 'Apenas usuários verificados podem atestar outros',
    vouchesReceived: 'atestações recebidas',
    vouchesNeeded: 'de 3 necessárias para verificação',
    noVouchesYet: 'Nenhuma atestação recebida ainda',
    verifiedByAdmin: 'Este usuário foi verificado diretamente por um administrador',
    verifyUser: 'Verificar usuário',
    verifiedBadge: 'Usuário verificado',
    unverifiedCannotVote: 'Apenas usuários verificados podem votar em enquetes',
    verificationStatus: 'Status de verificação',
    removeVouch: 'Remover atestação',
    vouchRemoved: 'Atestação removida',
    adminVerify: 'Verificar',
    adminUnverify: 'Desverificar',
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
    
    // Landing Page
    landingFeaturesTitle: 'How TaskMates Works',
    landingFeaturesSubtitle: 'Discover how our platform connects people through shared skills and interests.',
    landingFeatureRecommendationsTitle: 'Personalized Recommendations',
    landingFeatureRecommendationsDesc: 'Get task suggestions that match your skills and interests. Our algorithm analyzes your tags to find the best opportunities.',
    landingFeatureSearchTitle: 'Compatibility Search',
    landingFeatureSearchDesc: 'Find members with similar interests. See compatibility percentage based on shared skills and communities.',
    landingFeatureTagsTitle: 'Skills and Community Tags',
    landingFeatureTagsDesc: 'Organize and identify competencies and groups. Use tags to highlight what you can do and the circles you belong to.',
    landingFeatureReputationTitle: 'Profiles with Reputation',
    landingFeatureReputationDesc: 'Build your reputation through ratings and testimonials. Each completed task strengthens your credibility in the network.',
    landingFeatureBadgesTitle: 'Badges & Gamification',
    landingFeatureBadgesDesc: 'Earn badges by completing tasks and progressing on the platform. Each category has 12 progression levels that recognize your contributions.',
    landingFeatureNearbyTitle: 'Near You',
    landingFeatureNearbyDesc: 'Find tasks and active communities in your area. Connect with nearby people and strengthen your local network.',
    landingCTATitle: 'Ready to collaborate?',
    landingCTADescription: 'Join a community that values collaboration and mutual care. Start now and find people who share your values.',
    landingResearchText: 'TaskMates is part of a behavioral science research project that aims to investigate whether information technology and persuasive technologies can be effective tools to support and scale regenerative behavioral change and help people self-organize around the wellbeing of the whole.',
    landingResearchLink: 'Read the research project',
    mockupBadge1Category: 'Collaboration',
    mockupBadge1Name: 'Exemplary Altruist',
    mockupBadge2Category: 'Habits',
    mockupBadge2Name: 'Gardening',
    mockupBadge3Category: 'Leadership',
    mockupBadge3Name: 'Social Mobilizer',
    mockupNearbyTask1: 'Park cleanup event',
    mockupNearbyTask2: 'Outdoor yoga class',
    mockupNearbyCommunity1: 'Downtown Community Garden',
    mockupNearbyDistance1: '0.5 mi',
    mockupNearbyDistance2: '0.8 mi',
    mockupNearbyDistance3: '1.5 mi',
    
    // Landing Mockups
    mockupSearchPlaceholder: 'Search members...',
    mockupTask1Title: 'Help with community garden',
    mockupTask1Tags: 'Gardening,Sustainability',
    mockupTask2Title: 'English tutoring',
    mockupTask2Tags: 'Education,Languages',
    mockupTask3Title: 'Bicycle repair',
    mockupTask3Tags: 'Mechanics,Mobility',
    mockupUser1Name: 'Sarah Johnson',
    mockupUser1Location: 'San Francisco, CA',
    mockupUser2Name: 'Michael Chen',
    mockupUser2Location: 'New York, NY',
    mockupUser3Name: 'Emily Davis',
    mockupUser3Location: 'Austin, TX',
    mockupSkill1: 'Programming',
    mockupSkill2: 'Design',
    mockupSkill3: 'Gardening',
    mockupSkill4: 'Cooking',
    mockupSkill5: 'Languages',
    mockupCommunity1: 'Eco Villages USA',
    mockupCommunity2: 'Permaculture Network',
    mockupCommunity3: 'Sharing Economy',
    mockupProfileName: 'John Miller',
    mockupProfileLocation: 'Portland, OR',
    mockupTestimonialText: '"Excellent collaborator! Always punctual and dedicated to tasks."',
    mockupTestimonialAuthor: '— Sarah Johnson',
    
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
    authContinueWithGoogle: 'Continue with Google',
    authForgotPassword: 'Forgot password?',
    authForgotPasswordTitle: 'Reset Password',
    authForgotPasswordSubtitle: 'Enter your email to receive the reset link',
    authSendResetLink: 'Send reset link',
    authBackToLogin: 'Back to login',
    authResetEmailSent: 'Email sent!',
    authResetEmailSentDescription: 'Check your inbox for the reset link.',
    authPasswordsNotMatch: 'Passwords do not match',
    authPasswordUpdated: 'Password updated!',
    authPasswordUpdatedDescription: 'Your password has been updated successfully.',
    authInvalidResetLink: 'Invalid or expired link',
    authInvalidResetLinkDescription: 'The password reset link is invalid or has expired. Please request a new link.',
    authRedirectingToDashboard: 'Redirecting to dashboard...',
    authCreateNewPassword: 'Create New Password',
    authCreateNewPasswordSubtitle: 'Enter your new password below',
    authNewPassword: 'New password',
    authNewPasswordPlaceholder: 'Enter your new password',
    authConfirmPassword: 'Confirm password',
    authConfirmPasswordPlaceholder: 'Confirm your new password',
    authUpdatePassword: 'Update Password',
    authNurtureLifeTitle: 'Nurture Life Agreement',
    authNurtureLifeDescription: 'TaskMates has the common goal of NURTURING LIFE, which includes self-care actions, mutual aid, and socio-environmental care. Do you agree to collaborate with these goals?',
    authNurtureLifeRejected: 'TaskMates is reserved for people aligned with the common goal of Nurturing Life!',
    authAgreementRequired: 'Agreement required',
    authAgreementRequiredDescription: 'You need to agree with the Nurture Life Agreement to create your account.',
    yes: 'Yes, I agree',
    no: 'No, I disagree',
    
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
    taskPdfProof: 'PDF Document',
    viewDocument: 'View document',
    taskCreatedOn: 'Created on',
    taskDeadlineLabel: 'Deadline',
    taskBlockchainRegistered: 'Registered on Scroll Blockchain',
    taskCollaborationSent: 'Collaboration request sent!',
    taskAlreadyCollaborated: 'You have already requested collaboration on this task.',
    taskRequestSent: 'Request sent!',
    taskAlreadyRequested: 'You have already made a request on this task.',
    taskCancelCollaboration: 'Cancel collaboration',
    taskCancelRequest: 'Cancel request',
    taskCollaborationCanceled: 'Collaboration canceled!',
    taskRequestCanceled: 'Request canceled!',
    taskYouAreCollaborating: 'Collaborating',
    taskYouRequested: 'Requested',
    cancelCollaborationTitle: 'Cancel Collaboration',
    cancelCollaborationDescription: 'Are you sure you want to cancel your collaboration on this task? The task owner will be notified.',
    cancelRequestTitle: 'Cancel Request',
    cancelRequestDescription: 'Are you sure you want to cancel your request on this task? The task owner will be notified.',
    confirmCancel: 'Yes, cancel',
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
    taskLocation: 'Task location',
    taskLocationPlaceholder: 'Ex: Rio de Janeiro, RJ',
    
    // Location
    locationPlaceholder: 'City, State',
    useCurrentLocation: 'Use my current location',
    nearYou: 'Near you',
    nearYouDescription: 'Tasks and people in your city',
    noNearbyTasks: 'No tasks in your city',
    noNearbyPeople: 'No people in your city yet',
    addLocationWarning: 'Add your location in your profile to see nearby tasks',
    nearbyMapTitle: 'Nearby Activities',

    
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
    profileSkillsAndCommunities: 'Skills and Communities',
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
    blockUser: 'Block user',
    unblockUser: 'Unblock user',
    blockConfirmTitle: 'Block user?',
    blockConfirmMessage: 'The blocked user will not be able to see your profile, follow you, or view your posts. Continue?',
    blockSuccess: 'User blocked',
    unblockSuccess: 'User unblocked',
    profileBlockedMessage: 'This profile is not available.',
    confirm: 'Confirm',
    
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
    removeUser: 'Remove User',
    removeUserConfirm: 'Are you sure you want to remove this user? This action cannot be undone.',
    userRemoved: 'User removed successfully!',
    cannotRemoveSelf: 'You cannot remove your own account',
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
    editTag: 'Edit Tag',
    editTagName: 'Tag Name',
    editTagCategory: 'Category',
    tagUpdated: 'Tag updated successfully!',
    saveTag: 'Save Tag',
    profileSkills: 'Skills',
    profileCommunities: 'Communities',
    
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
    myPublicProfile: 'My Public Profile',
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
    activityCollaboratorCompleted: 'completed as collaborator',
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
    commonTags: 'Tags in Common',
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
    
    // PWA Install
    installApp: 'Install App',
    installDescription: 'Install the app on your phone for quick and offline access',
    appInstalled: 'App installed successfully!',
    openApp: 'Open App',
    installNow: 'Install Now',
    iosInstallInstructions: 'To install on iPhone/iPad, follow these steps:',
    iosStep1: 'Tap the share button (square with arrow)',
    iosStep2: 'Scroll and tap "Add to Home Screen"',
    iosStep3: 'Tap "Add" to confirm',
    installInstructions: 'Use your browser menu to install the app:',
    chromeInstall: 'Menu → Install app',
    edgeInstall: 'Menu → Apps → Install this site as an app',
    firefoxInstall: 'Menu → Add to Home Screen',
    offlineAccess: 'Offline Access',
    fastLoading: 'Fast Loading',
    addToHomeScreen: 'Add to Home Screen',
    addToHomeScreenManual: 'Use your browser\'s share menu and select "Add to Home Screen"',
    
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
    
    // Task History & Delete
    taskDeleteConfirm: 'Delete task',
    taskDeleteConfirmDescription: 'Are you sure you want to delete this task? All involved people will be notified.',
    taskDeleteSuccess: 'Task deleted successfully!',
    taskDeleteError: 'Error deleting task',
    taskHistory: 'Change history',
    taskHistoryEmpty: 'No changes recorded',
    taskHistoryCreated: 'created the task',
    taskHistoryUpdated: 'updated',
    taskHistoryDeleted: 'deleted the task',
    taskHistoryCompleted: 'completed the task',
    taskHistoryField: 'field',
    taskHistoryFrom: 'from',
    taskHistoryTo: 'to',
    confirmDelete: 'Confirm deletion',
    
    // Social Links & Contact
    socialLinks: 'Social Links',
    socialLinksDescription: 'Add links to your social media profiles',
    contactMethods: 'Contact Methods',
    contactMethodsDescription: 'Optionally add direct contact methods',
    
    // Report
    averageRating: 'Average rating',
    ratings: 'ratings',
    ratingHistory: 'Rating history',
    task: 'Task',
    rater: 'Rater',
    rating: 'Rating',
    date: 'Date',
    anonymous: 'Anonymous',
    
    // Task Image & Completion
    taskImage: 'Task image',
    taskImageOptional: 'Image (optional)',
    taskSelectImage: 'Select image',
    taskImageSelected: 'Image selected',
    taskMarkAsCompleted: 'Mark as completed',
    taskMarkAsCompletedDescription: 'When checked, you will be prompted to add proof of completion.',
    
    // Priority
    taskPriority: 'Priority',
    taskPriorityOptional: 'Priority (optional)',
    taskPriorityLow: 'Low',
    taskPriorityMedium: 'Medium',
    taskPriorityHigh: 'High',
    taskHighPriority: 'High priority',
    
    // Completion Flow
    taskProofSubmitted: 'Proof submitted!',
    taskProofSubmittedDescription: 'The task creator will be notified to confirm completion.',
    taskPendingConfirmation: 'Awaiting creator confirmation',
    taskConfirmCompletionAction: 'Confirm completion',
    taskSubmitProof: 'Submit proof',
    
    // Rating Modal
    rateUser: 'Rate user',
    rateUserDescription: 'Leave your rating about their participation in this task.',
    selectRating: 'Click to rate',
    star: 'star',
    stars: 'stars',
    ratingCommentOptional: 'Comment (optional)',
    ratingCommentRequired: 'Comment (required)',
    ratingCommentRequiredHelp: 'For ratings of 3 stars or less, a comment is required to help improve performance.',
    ratingCommentPlaceholder: 'Tell us more about your experience...',
    ratingComment: 'Comment',
    sending: 'Sending...',
    submitRating: 'Submit rating',
    
    // PWA Update
    newVersionAvailable: 'New version available!',
    updateNow: 'Update now',
    
    // Navigation
    dashboard: 'Home',
    
    // Quiz
    quizTitle: 'Potentials Quiz',
    quizDescription: 'Discover and add your skills and communities to your profile',
    quizQuestion: 'Question',
    of: 'of',
    quizQ1Title: 'In a community task force, which actions are you most interested in contributing to?',
    quizQ1Subtitle: 'What type of community effort do you find most important and would be happiest to participate in...',
    quizQ2Title: 'What do you love to do and what does your soul drive you to create? 💚',
    quizQ2Subtitle: 'That thing that makes you lose track of time and energizes you instead of draining you...',
    quizQ3Title: 'If you could help your neighbors in one way today, it would be... 🤝',
    quizQ3Subtitle: "It doesn't have to be big. Small gestures transform the world.",
    quizQ4Title: 'What skill do you have that people always ask for your help with? ⭐',
    quizQ4Subtitle: "You know that thing that's easy for you but seems like magic to others?",
    quizQ5Title: "What have you always wanted to learn but never had time for? 🌱",
    quizQ5Subtitle: 'Now is the time! Declaring your intention is the first step.',
    quizQ6Title: 'When you were a child, what did you most enjoy playing? 🎈',
    quizQ6Subtitle: 'Our earliest passions reveal our natural gifts.',
    quizQ7Title: 'If you had a free afternoon, how would you like to use it to make the world a little better? 🌍',
    quizQ7Subtitle: 'What does your heart call you to heal and regenerate?',
    quizQ8Title: 'During group work, you focus on…',
    quizQ8Subtitle: 'How do you see yourself at your best?',
    quizQ9Title: 'In which environment do you feel most alive? 🌈',
    quizQ9Subtitle: 'Where does your energy flow naturally?',
    quizQ10Title: 'How do you prefer to contribute to a community project? 🤝',
    quizQ10Subtitle: 'We all have a unique way to add value!',
    quizQ11Title: 'If you could start a regenerative habit now, what would it be? 🌿',
    quizQ11Subtitle: 'Starting is the most underrated superpower!',
    quizSuggestedTags: 'Suggested tags:',
    quizAddCustomTag: 'Add custom tag:',
    quizTagPlaceholder: 'Type tag name...',
    quizSelectedTags: 'Selected tags',
    quizSkip: 'Skip quiz',
    quizNext: 'Next',
    quizComplete: 'Complete',
    quizCompleted: 'Quiz completed!',
    quizTagsAdded: '{count} tags were added to your profile.',
    quizCompletionTitle: 'Congratulations! 🎉',
    quizCompletionMessage: 'You completed the Potentials Quiz! Your new tags will help find the best connections and tasks for you.',
    quizTagsAddedCount: 'tags added to your profile',
    quizGoToDashboard: 'Go to Dashboard',
    quizGoToProfile: 'Edit Profile',
    tagCreated: 'Tag created successfully!',
    quizBannerTitle: 'Discover your potentials!',
    quizBannerDescription: 'Take our quick quiz to add more tags to your profile and improve your matchmaking chances.',
    quizBannerCTA: 'Take Quiz',
    quizNotificationMessage: 'Complete the Potentials Quiz to improve your profile and get better recommendations!',
    
    // My Tasks Section
    myTasksSection: 'My Tasks',
    actionPlan: 'Action Plan',
    actionPlanDescription: 'Your offers, personal tasks and active collaborations',
    noActionPlanTasks: 'No tasks in action plan',
    demands: 'Demands',
    demandsDescription: 'Your requests and tasks you are waiting for',
    noDemandsTasks: 'No demands found',
    impact: 'Impact',
    impactDescription: 'Completed tasks you participated in',
    noImpactTasks: 'No completed tasks found',
    filterToday: 'Today',
    filterMonth: 'This month',
    filterAllTasks: 'All',
    filterPersonal: 'Personal',
    filterCreator: 'Creator',
    filterCollaborator: 'Collaborator',
    filterRequester: 'Requester',
    showMore: 'Show more',
    showLess: 'Show less',
    noTagsFound: 'No tags found',
    popularTags: 'Popular tags',
    
    // Chat
    chatTitle: 'Conversations',
    chatBack: 'Back',
    chatNoMessages: 'No messages yet. Start the conversation!',
    chatNoConversations: 'No conversations yet',
    chatInputPlaceholder: 'Type a message...',
    chatUnknownUser: 'User',
    chatGroupConversation: 'Group conversation',
    chatParticipants: 'participants',
    chatViewTask: 'View task',
    chatYesterday: 'Yesterday',
    chatStartConversation: 'Start conversation',
    chatSelectConversation: 'Select a conversation to start',
    chatUploadError: 'Error uploading file',
    chatFileTooLarge: 'File too large (max 10MB)',
    chatAttachment: 'Attachment',
    chatDownloadFile: 'Download file',
    chatTypingSingle: '{name} is typing...',
    chatTypingTwo: '{name1} and {name2} are typing...',
    chatTypingMultiple: 'Several people are typing...',
    chatUserUnknown: 'Someone',
    chatSearchMessages: 'Search messages',
    chatSearchPlaceholder: 'Search in conversation...',
    chatNoSearchResults: 'No messages found',
    chatNewConversation: 'New conversation',
    chatDirectMessage: 'Direct message',
    chatCreateGroup: 'Create group',
    chatGroupName: 'Group name',
    chatGroupNamePlaceholder: 'E.g. Community Garden Project',
    chatSelectMembers: 'Select members',
    chatMinGroupMembers: 'Select at least 2 members',
    chatSearchUsersPlaceholder: 'Search users by name...',
    chatNoUsersFound: 'No users found',
    chatTypeToSearch: 'Type at least 2 characters to search',
    chatMembers: 'Members',
    chatYou: 'You',
    chatAddMember: 'Add member',
    chatLeaveGroup: 'Leave group',
    chatMemberAdded: 'Member added',
    chatMemberRemoved: 'Member removed',
    chatMemberAddError: 'Error adding member',
    chatMemberRemoveError: 'Error removing member',
    chatLeftGroup: 'You left the group',

    // Task Settings Extended
    autoApproveCollaborators: 'Auto-approve collaborators',
    autoApproveCollaboratorsDesc: 'New collaborators are approved and added to the chat automatically',
    autoApproveRequesters: 'Auto-approve requesters',
    autoApproveRequestersDesc: 'New requesters are approved and added to the chat automatically',
    limitParticipants: 'Limit participants',
    maxCollaborators: 'Max. collaborators',
    maxRequesters: 'Max. requesters',
    repeatTask: 'Repeat task',
    repeatNever: 'Do not repeat',
    repeatDaily: 'Daily',
    repeatWeekly: 'Weekly',
    repeatMonthly: 'Monthly',
    repeatYearly: 'Yearly',
    repeatCustom: 'Custom',
    repeatTimesPerWeek: 'time(s) per week',
    repeatTimesPerMonth: 'time(s) per month',
    repeatTimesPerYear: 'time(s) per year',
    repeatDaysOfWeek: 'Days of week',
    repeatEndDate: 'End date',
    repeatEndOccurrences: 'Number of occurrences',
    repeatEndsAfter: 'Ends after',
    repeatEndsOn: 'Ends on',
    repeatOccurrences: 'occurrences',
    enableStreak: 'Track Streak',
    enableStreakDesc: 'Counts how many times the task was completed on the scheduled date (late completion does not count)',
    taskSettingsCollapsible: 'Task settings',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',

    // Badges
    badgesTitle: 'Skill Badges',
    badgesSeeAll: 'See all',
    badgesPageTitle: 'My Skill Badges',
    badgesPageSubtitle: 'Achievements earned through your participation and contributions',
    badgesMyBadges: 'Earned badges',
    badgesNoBadges: 'No badges yet',
    badgesNoBadgesDesc: 'Complete tasks to start earning badges!',
    badgesLockedLabel: 'Locked',
    badgesEarnedAt: 'Earned on',
    badgesLevel: 'Level',
    badgesLevelSilver: 'Silver',
    badgesLevelGold: 'Gold',
    badgesLevelDiamond: 'Diamond',
    badgesCategoryTaskmates: 'Taskmates',
    badgesCategoryHabits: 'Habits',
    badgesCategoryCommu: 'Communities',
    badgesCategoryLeadership: 'Leadership',
    badgesCategoryCollab: 'Collaboration',
    badgesCategoryImpact: 'Positive Impact',
    badgesCategorySociability: 'Sociability',
    badgesCategoryReliability: 'Reliability',
    badgesCategoryConsistency: 'Consistency',
    badgesDescTaskmates: 'Indicates your top teammates. Earned by completing tasks together.',
    badgesDescHabits: 'Indicates your target behaviors. Earned by completing tasks with the same skill tag.',
    badgesDescCommu: 'Indicates your most active communities. Earned by completing tasks with the same community tag.',
    badgesDescLeadership: 'Indicates your ability to mobilize people. Earned by gathering collaborators and requesters in your task.',
    badgesDescCollab: 'Indicates your teamwork spirit. Earned by completing tasks as a collaborator for others.',
    badgesDescImpact: 'Indicates the recognition of your tasks. Earned by accumulating likes on a single completed task.',
    badgesDescSociability: 'Indicates your ability to build networks. Earned by accumulating followers.',
    badgesDescReliability: 'Indicates your integrity and high execution level. Earned by receiving consecutive maximum ratings.',
    badgesDescConsistency: 'Indicates your personal commitment. Earned by accumulating streaks in repeated tasks.',
    badgesRequirement: 'Requirement',
    badgesTaskHistory: 'Badge task history',
    badgesNoTaskHistory: 'No tasks found for this badge.',
    badgesCompletedOn: 'Completed on',
    badgesFilterAll: 'All',
    badgesNewBadgeNotif: '🏅 You earned a new badge!',
    badgesLevelUpNotif: '⬆️ Your badge leveled up!',
    badgesSyncNow: 'Sync badges',
    
    // Polls
    relatedPolls: 'Related polls',
    noRelatedPolls: 'No related polls',
    pollsAll: 'All',
    pollsVoting: 'Voting',
    pollsClosed: 'Closed',
    pollStatusActive: 'Voting',
    pollStatusClosed: 'Closed',

    // Verification
    verified: 'Verified',
    unverified: 'Unverified',
    vouch: 'Vouch',
    vouchUser: 'Vouch for user',
    vouchSuccess: 'Vouch registered successfully!',
    vouchAlready: 'You already vouched for this user',
    vouchSelf: 'You cannot vouch for yourself',
    vouchRequiresVerified: 'Only verified users can vouch for others',
    vouchesReceived: 'vouches received',
    vouchesNeeded: 'of 3 needed for verification',
    noVouchesYet: 'No vouches received yet',
    verifiedByAdmin: 'This user was directly verified by an administrator',
    verifyUser: 'Verify user',
    verifiedBadge: 'Verified user',
    unverifiedCannotVote: 'Only verified users can vote in polls',
    verificationStatus: 'Verification status',
    removeVouch: 'Remove vouch',
    vouchRemoved: 'Vouch removed',
    adminVerify: 'Verify',
    adminUnverify: 'Unverify',
  },
};

