import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const directDatabaseUrl = process.env.DATABASE_URL_DIRECT
const accelerateDatabaseUrl = process.env.DATABASE_URL

if (!directDatabaseUrl && !accelerateDatabaseUrl) {
  throw new Error('DATABASE_URL_DIRECT or DATABASE_URL is not defined')
}

const prisma = directDatabaseUrl
  ? new PrismaClient({ adapter: new PrismaPg(directDatabaseUrl) })
  : new PrismaClient({ accelerateUrl: accelerateDatabaseUrl! })

async function main() {
  console.log('🌱 Seeding database...')

  // Crear roles por defecto
  const roles = [
    {
      name: 'admin',
      displayName: 'Administrator',
    },
    {
      name: 'consultant',
      displayName: 'Consultant',
    },
    {
      name: 'organization',
      displayName: 'Organization',
    }
  ]

  for (const role of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: role.name }
    })

    if (!existingRole) {
      await prisma.role.create({
        data: role
      })
      console.log(`✅ Created role: ${role.displayName}`)
    } else {
      console.log(`⏭️  Role ${role.displayName} already exists`)
    }
  }

  // ==========================
  // Module: Zoom In
  // ==========================
  const zoomIn = await prisma.module.upsert({
    where: { name: 'Zoom In' },
    update: {},
    create: {
      name: 'Zoom In',
      description: 'Módulo enfocado en evaluar la madurez digital interna de la organización (habilidades, capacidades y activos).',
    },
  })

  console.log('✅ Module "Zoom In" created')

  // ==========================
  // Module: Zoom Out
  // ==========================
  const zoomOut = await prisma.module.upsert({
    where: { name: 'Zoom Out' },
    update: {},
    create: {
      name: 'Zoom Out',
      description: 'Módulo enfocado en evaluar las fuerzas externas que ejercen presión positiva o negativa sobre el modelo de negocio.',
    },
  })

  console.log('✅ Module "Zoom Out" created')

  // ==========================
  // Forms under Zoom In
  // ==========================

  const zoomInForms = [
    {
      name: 'Habilidades',
      tag: 'habilidades',
      description: 'Competencias individuales necesarias para operar en entornos digitales y adoptar nuevas tecnologías.',
      categories: [
        {
          name: 'Habilidades digitales básicas',
          examples: [
            'Gestión de ofimática en la nube',
            'Navegación segura',
            'Uso del correo corporativo',
          ],
        },
        {
          name: 'Habilidades analíticas',
          examples: [
            'Interpretación de datos',
            'Pensamiento crítico',
            'Modelado de procesos',
          ],
        },
        {
          name: 'Habilidades técnicas',
          examples: [
            'Programación',
            'Gestión de bases de datos',
            'Administración de redes',
          ],
        },
        {
          name: 'Habilidades en tecnologías emergentes',
          examples: [
            'Inteligencia artificial',
            'Ciencia de datos',
            'Blockchain',
            'Automatización (RPA)',
          ],
        },
        {
          name: 'Habilidades de colaboración digital',
          examples: [
            'Plataformas colaborativas (MS Teams, Google Workspace, Notion)',
          ],
        },
        {
          name: 'Habilidades de gestión del cambio',
          examples: [
            'Resiliencia',
            'Adaptabilidad',
            'Liderazgo durante la disrupción tecnológica',
          ],
        },
        {
          name: 'Habilidades de innovación',
          examples: [
            'Creatividad',
            'Design Thinking',
            'Prototipado rápido',
          ],
        },
        {
          name: 'Habilidades en ciberseguridad',
          examples: [
            'Buenas prácticas de seguridad',
            'Gestión de accesos',
            'Reconocimiento de amenazas',
          ],
        },
      ],
    },
    {
      name: 'Capacidades',
      tag: 'capacidades',
      description: 'Capacidades organizacionales que permiten a una empresa operar, innovar y adaptarse en entornos digitales.',
      categories: [
        {
          name: 'Capacidades operativas',
          examples: [
            'Automatización de procesos',
            'BPM',
            'Control de calidad digital',
            'Trazabilidad',
          ],
        },
        {
          name: 'Capacidades comerciales',
          examples: [
            'Comercio electrónico',
            'CRM',
            'Marketing digital',
            'Experiencia del cliente omnicanal',
          ],
        },
        {
          name: 'Capacidades tecnológicas',
          examples: [
            'Gestión TI',
            'Arquitectura empresarial',
            'Desarrollo de software',
            'Gestión de APIs',
          ],
        },
        {
          name: 'Capacidades analíticas',
          examples: [
            'Analítica de datos',
            'Inteligencia de negocios',
            'Dashboards',
          ],
        },
        {
          name: 'Capacidades estratégicas',
          examples: [
            'Toma de decisiones basada en datos',
            'Agilidad organizacional',
            'Innovación abierta',
          ],
        },
        {
          name: 'Capacidades de gestión del conocimiento',
          examples: [
            'Documentación digital',
            'Gestión del aprendizaje',
            'Comunidades de práctica',
          ],
        },
        {
          name: 'Capacidades de sostenibilidad digital',
          examples: [
            'Gestión del ciclo de vida de los datos',
            'Eficiencia energética',
            'Economía circular',
          ],
        },
        {
          name: 'Capacidades de ciberseguridad organizacional',
          examples: [
            'Gestión del riesgo digital',
            'Respuesta a incidentes',
            'Protección de activos',
          ],
        },
      ],
    },
    {
      name: 'Activos Estratégicos',
      tag: 'activos-estrategicos',
      description: 'Elementos que actualmente generan valor económico directo o indirecto para el negocio.',
      categories: [
        {
          name: 'Productos y servicios digitales',
          examples: [
            'Plataformas web',
            'Aplicaciones móviles',
            'Servicios basados en la nube',
          ],
        },
        {
          name: 'Bases de datos monetizadas',
          examples: [
            'Listados de clientes',
            'Catálogos de productos',
            'Datos transaccionales',
          ],
        },
        {
          name: 'Propiedad intelectual',
          examples: [
            'Patentes',
            'Algoritmos propietarios',
            'Software registrado',
          ],
        },
        {
          name: 'Sistemas y plataformas tecnológicas',
          examples: [
            'ERP',
            'CRM',
            'LMS',
            'Plataformas de automatización o integración',
          ],
        },
        {
          name: 'Redes de clientes o socios',
          examples: [
            'Alianzas tecnológicas',
            'Marketplaces',
            'Ecosistemas colaborativos',
          ],
        },
        {
          name: 'Modelos de negocio digitales',
          examples: [
            'Modelos de suscripción',
            'Economía de plataformas',
            'Servicios SaaS',
          ],
        },
      ],
    },
    {
      name: 'Activos Ocultos',
      tag: 'activos-ocultos',
      description: 'Elementos valiosos aún no explotados o monetizados completamente que pueden habilitar la innovación.',
      categories: [
        {
          name: 'Know-how interno',
          examples: [
            'Experiencia del equipo',
            'Mejores prácticas no documentadas',
          ],
        },
        {
          name: 'Redes internas y externas',
          examples: [
            'Contactos informales del ecosistema',
            'Alumni o socios inactivos',
          ],
        },
        {
          name: 'Conocimiento no estructurado',
          examples: [
            'Documentos dispersos',
            'Datos históricos',
            'Insights de clientes no sintetizados',
          ],
        },
        {
          name: 'Talentos emergentes',
          examples: [
            'Habilidades autodidactas en IA, blockchain o herramientas low-code',
          ],
        },
        {
          name: 'Procesos no optimizados',
          examples: [
            'Procesos manuales que podrían digitalizarse',
          ],
        },
        {
          name: 'Ideas no implementadas',
          examples: [
            'Propuestas internas',
            'Prototipos archivados',
            'Pilotos abandonados',
          ],
        },
        {
          name: 'Cultura pro-innovación latente',
          examples: [
            'Iniciativas locales no escaladas',
            'Apertura al cambio',
          ],
        },
      ],
    },
  ]

  // ==========================
  // Forms under Zoom Out
  // ==========================

  const zoomOutForms = [
    {
      name: 'Tendencias Clave',
      tag: 'tendencias',
      description: 'Cambios tecnológicos, sociales o culturales globales que afectan directa o indirectamente el comportamiento del mercado y los modelos de negocio.',
      categories: [
        {
          name: 'Tecnología y digitalización',
          examples: [
            'Creciente adopción de inteligencia artificial',
            'Digitalización de la cadena de valor',
            'Expansión del cómputo en la nube',
            'Automatización inteligente (RPA + IA)',
            'Auge de plataformas low-code/no-code',
          ],
        },
        {
          name: 'Clientes y mercado',
          examples: [
            'Crecimiento del trabajo remoto',
            'Uso de datos como nuevo activo estratégico',
          ],
        },
        {
          name: 'Talento y seguridad',
          examples: [
            'Demanda de sostenibilidad y economía circular',
            'Integración de tecnologías inmersivas (AR/VR)',
          ],
        },
        {
          name: 'Estrategia y regulación',
          examples: [
            'Transición hacia modelos de negocio basados en datos',
          ],
        },
      ],
    },
    {
      name: 'Fuerzas del Mercado',
      tag: 'fuerzas-mercado',
      description: 'Dinámicas cambiantes y expectativas de los consumidores y el entorno competitivo que influyen directamente en la propuesta de valor de una organización.',
      categories: [
        {
          name: 'Clientes y mercado',
          examples: [
            'Cambio en las expectativas del cliente digital',
            'Mayor competencia a través de canales digitales',
            'Aceleración de modelos de negocio disruptivos',
            'Clientes más informados y exigentes',
            'Preferencia por experiencias personalizadas',
            'Crecimiento de marketplaces',
            'Presión por tiempos de entrega reducidos',
            'Hiperpersonalización de servicios',
            'Demanda de atención omnicanal',
            'Exigencia de transparencia y trazabilidad',
          ],
        },
      ],
    },
    {
      name: 'Fuerzas de la Industria',
      tag: 'fuerzas-industria',
      description: 'Cambios tecnológicos, estructurales o regulatorios que afectan la dinámica de competencia en un sector específico o que provienen de agentes clave como competidores, proveedores o plataformas dominantes.',
      categories: [
        {
          name: 'Tecnología y digitalización',
          examples: [
            'Automatización de procesos industriales',
            'Consolidación de grandes plataformas digitales',
            'Nuevos estándares de interoperabilidad',
            'Adopción de estándares internacionales de calidad digital',
          ],
        },
        {
          name: 'Talento y seguridad',
          examples: [
            'Desintermediación por plataformas tecnológicas',
            'Presión para integrar inteligencia operacional',
            'Consolidación de ecosistemas verticales',
            'Competencia con startups tecnológicas',
          ],
        },
        {
          name: 'Estrategia y regulación',
          examples: [
            'Presión regulatoria sectorial',
          ],
        },
        {
          name: 'Clientes y mercado',
          examples: [
            'Transformación de cadenas logísticas tradicionales',
          ],
        },
      ],
    },
    {
      name: 'Fuerzas Macroeconómicas',
      tag: 'fuerzas-macroeconomicas',
      description: 'Factores políticos, económicos o legales globales o regionales que impactan directa o indirectamente las decisiones estratégicas y operativas de las organizaciones.',
      categories: [
        {
          name: 'Estrategia y regulación',
          examples: [
            'Regulaciones de protección de datos',
            'Políticas de incentivo a la transformación digital',
            'Fluctuaciones monetarias que impactan la tecnología',
            'Políticas fiscales para servicios digitales',
            'Incentivos gubernamentales para la innovación',
            'Riesgos geopolíticos que afectan la cadena de suministro',
            'Restricciones comerciales sobre tecnologías clave',
            'Marcos internacionales de gobernanza digital',
          ],
        },
        {
          name: 'Talento y seguridad',
          examples: [
            'Inflación y escasez de talento tecnológico',
            'Aumento de ciberamenazas globales',
          ],
        },
      ],
    },
  ]

  // Create all Zoom In forms with nested categories and items
  for (const formData of zoomInForms) {
    const form = await prisma.form.upsert({
      where: { name: formData.name },
      update: {},
      create: {
        name: formData.name,
        description: formData.description,
        tag: formData.tag,
        moduleId: zoomIn.id,
        categories: {
          create: formData.categories.map(cat => ({
            name: cat.name,
            items: {
              create: cat.examples.map(example => ({
                name: example,
              })),
            },
          })),
        },
      },
    })
    console.log(`✅ Created Zoom In form: ${form.name}`)
  }

  // Create all Zoom Out forms with nested categories and items
  for (const formData of zoomOutForms) {
    const form = await prisma.form.upsert({
      where: { name: formData.name },
      update: {},
      create: {
        name: formData.name,
        description: formData.description,
        tag: formData.tag,
        moduleId: zoomOut.id,
        categories: {
          create: formData.categories.map(cat => ({
            name: cat.name,
            items: {
              create: cat.examples.map(example => ({
                name: example,
              })),
            },
          })),
        },
      },
    })
    console.log(`✅ Created Zoom Out form: ${form.name}`)
  }

  console.log('🎉 Seeding completed successfully!')

  // Asegurar configuración de informe por defecto para organizaciones: usar /logoudea.png como logo por defecto
  const orgUsers = await prisma.user.findMany({ where: { role: { name: 'organization' } }, select: { id: true } });
  for (const org of orgUsers) {
    await prisma.reportDisplayConfig.upsert({
      where: { organizationUserId: org.id },
      create: {
        organizationUserId: org.id,
        logoUrl: '/logoudea.svg',
        primaryColor: '#2E6347',
        secondaryColor: '#24533b',
      },
      update: {
        // no sobrescribir si ya existe
      },
    });
  }

}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

