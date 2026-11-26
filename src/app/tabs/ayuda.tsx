
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModuleScreen } from '@/components/module-screen';
import {
  ReservationButton,
  reservationStyles as ui,
} from '@/components/reservation-ui';
import { useTekoraTheme } from '@/theme/tekora-theme';

const topics: Record<
  string,
  {
    title: string;
    text: string;
    link?: { label: string; href: Href };
  }
> = {
  ayuda: {
    title: 'Centro de ayuda',
    text: 'Consulta tu solicitud para ver su estado, conversar con el prestador y revisar la cotización o la reserva asociada.',
    link: {
      label: 'Abrir Mis solicitudes',
      href: {
        pathname: '/tabs/servicios',
        params: { vista: 'historial' },
      },
    },
  },
  favoritos: {
    title: 'Expertos favoritos',
    text: 'Guardar favoritos aún no está disponible en esta versión.',
    link: {
      label: 'Buscar expertos',
      href: '/tabs/expertos',
    },
  },
  direcciones: {
    title: 'Mis direcciones',
    text: 'La app aún no guarda una libreta de direcciones.',
  },
  pagos: {
    title: 'Métodos de pago',
    text: 'Tekora Móvil no guarda tarjetas. El checkout de prueba solo opera en un laboratorio local y no realiza cobros.',
  },
  privacidad: {
    title: 'Términos y privacidad',
    text: '',
  },
  preferencias: {
    title: 'Preferencias',
    text: 'Esta versión aún no guarda preferencias de cuenta en el servidor.',
  },
};

const condiciones = [
  {
    title: '1. Sobre Tekora',
    text: 'Tekora es una plataforma tecnológica destinada a facilitar el encuentro entre personas que necesitan servicios y prestadores que los ofrecen. Permite consultar servicios, realizar solicitudes, recibir cotizaciones, gestionar reservas y mantener conversaciones relacionadas con la contratación.',
  },
  {
    title: '2. Usuarios y cuentas',
    text: 'Los usuarios deben proporcionar información veraz y mantener la seguridad de sus credenciales. Cada cuenta debe utilizarse de manera legítima. No está permitido suplantar identidades, acceder a cuentas ajenas ni utilizar la plataforma para actividades fraudulentas o ilícitas.',
  },
  {
    title: '3. Solicitudes y cotizaciones',
    text: 'Las solicitudes permiten describir un servicio requerido. Las cotizaciones informan las condiciones y el precio propuesto para su realización. El usuario debe revisar la información disponible antes de confirmar una contratación. La publicación de un servicio no constituye por sí misma una reserva confirmada.',
  },
  {
    title: '4. Reservas y disponibilidad',
    text: 'Las reservas dependen de la disponibilidad del prestador y de las condiciones comunicadas durante el proceso de contratación. Cuando se aplique una retención temporal de horario, su duración y vencimiento deberán mostrarse claramente antes de confirmar.',
  },
  {
    title: '5. Precios y pagos',
    text: 'Los importes aplicables a cada servicio deberán mostrarse en pesos mexicanos (MXN), junto con los conceptos y cargos correspondientes antes de la confirmación. Los medios de pago disponibles dependerán de las funciones habilitadas. Las pruebas o demostraciones técnicas no constituyen cargos reales.',
  },
  {
    title: '6. Obligaciones del prestador',
    text: 'El prestador es responsable de describir sus servicios de manera veraz, respetar las condiciones aceptadas, informar los requisitos necesarios para la prestación y actuar con diligencia y profesionalismo. Las responsabilidades específicas de la plataforma y del prestador dependerán de la operación y de la legislación aplicable.',
  },
  {
    title: '7. Obligaciones del solicitante',
    text: 'El solicitante debe proporcionar la información necesaria para el servicio, revisar las condiciones de la contratación, respetar los horarios acordados y utilizar las herramientas de comunicación de manera adecuada.',
  },
  {
    title: '8. Comunicación segura',
    text: 'Las conversaciones de Tekora están destinadas al seguimiento de solicitudes y servicios. La aplicación aplica restricciones al intercambio de teléfonos, correos electrónicos y enlaces de contacto directo en determinados formularios y mensajes para favorecer la trazabilidad de las operaciones.',
  },
  {
    title: '9. Cancelaciones y reclamaciones',
    text: 'Las solicitudes de cancelación, reembolso o aclaración deberán evaluarse conforme a las condiciones comunicadas para el servicio, los hechos documentados y la legislación aplicable. No se garantiza automáticamente la aprobación de un reembolso ni se excluyen los derechos irrenunciables del consumidor.',
  },
  {
    title: '10. Uso indebido',
    text: 'No se permite publicar información falsa, acosar a otros usuarios, intentar vulnerar la seguridad del sistema, enviar contenido ilícito o utilizar la plataforma para actividades diferentes de sus finalidades legítimas. Tekora podrá adoptar medidas proporcionales ante incumplimientos, respetando los derechos aplicables.',
  },
  {
    title: '11. Disponibilidad tecnológica',
    text: 'La plataforma puede requerir mantenimiento, actualizaciones y correcciones técnicas. Los errores o interrupciones deberán atenderse mediante los mecanismos de soporte disponibles. Este apartado no limita los derechos que correspondan legalmente a los usuarios.',
  },
  {
    title: '12. Actualizaciones de las condiciones',
    text: 'Las modificaciones de estos términos deberán comunicarse por medios accesibles. Cuando una modificación requiera aceptación adicional por disposición legal, Tekora deberá obtenerla antes de aplicarla.',
  },
];

const privacidad = [
  {
    title: '1. Responsable del tratamiento',
    text: 'El responsable de los datos personales será la persona física o moral que opere legalmente Tekora. Antes de publicar este aviso deberán indicarse su nombre o razón social, domicilio y medio oficial de contacto para asuntos de privacidad.',
  },
  {
    title: '2. Datos personales tratados',
    text: 'Según las funciones utilizadas, Tekora puede tratar datos de registro y cuenta, como nombre y correo electrónico; fotografía de perfil cuando sea proporcionada; información de solicitudes, cotizaciones y reservas; mensajes vinculados a servicios; y registros técnicos necesarios para el funcionamiento y la seguridad.',
  },
  {
    title: '3. Finalidades necesarias',
    text: 'Los datos se utilizan para autenticar cuentas, mostrar información del perfil, gestionar solicitudes y reservas, facilitar comunicaciones relacionadas con los servicios, atender aclaraciones, mantener registros operativos y proteger la seguridad e integridad de la plataforma.',
  },
  {
    title: '4. Finalidades adicionales',
    text: 'El uso de datos para publicidad personalizada, promociones u otras finalidades no necesarias deberá informarse separadamente y, cuando proceda, ofrecer mecanismos para aceptar, rechazar o revocar el consentimiento correspondiente. Este borrador no afirma que tales tratamientos estén activos.',
  },
  {
    title: '5. Acceso y comunicación de datos',
    text: 'Determinada información de una solicitud o reserva puede ser necesaria para que el prestador correspondiente atienda el servicio. Antes de publicar el aviso definitivo se deberán identificar y describir las transferencias de datos que efectivamente se realicen, sus destinatarios y los supuestos que requieran consentimiento.',
  },
  {
    title: '6. Protección de la información',
    text: 'Tekora debe implementar medidas administrativas, técnicas y físicas adecuadas para proteger los datos personales frente a accesos no autorizados, pérdida, alteración o uso indebido. Ningún servicio digital puede garantizar la ausencia absoluta de riesgos.',
  },
  {
    title: '7. Conservación y eliminación',
    text: 'Los datos deberán conservarse durante los plazos necesarios para las finalidades informadas, obligaciones legales y posibles responsabilidades. Las solicitudes de eliminación se atenderán conforme a las disposiciones aplicables, incluyendo los supuestos en que proceda bloquear o conservar cierta información.',
  },
  {
    title: '8. Derechos ARCO',
    text: 'Las personas titulares pueden solicitar el acceso, rectificación, cancelación u oposición respecto de sus datos personales, en los casos y condiciones previstos por la ley. El aviso definitivo deberá indicar un medio de contacto real, los requisitos de solicitud y el procedimiento de respuesta.',
  },
  {
    title: '9. Revocación y limitación',
    text: 'Los usuarios podrán solicitar la revocación de su consentimiento o la limitación del uso y divulgación de sus datos, cuando legalmente proceda. Estos mecanismos y sus posibles consecuencias deberán explicarse en el aviso definitivo.',
  },
  {
    title: '10. Cambios al aviso',
    text: 'Las modificaciones relevantes al aviso de privacidad deberán comunicarse a los usuarios mediante un procedimiento accesible, indicando la versión y la fecha de entrada en vigor.',
  },
];

const contratacion = [
  {
    title: 'Cotizaciones',
    text: 'Antes de confirmar un servicio deben mostrarse su descripción, importe, moneda y condiciones aplicables. Las modificaciones posteriores requieren seguir el procedimiento correspondiente.',
  },
  {
    title: 'Confirmación de reservas',
    text: 'La reserva deberá reflejar claramente su estado y las condiciones aceptadas. Una solicitud enviada y una reserva confirmada no son necesariamente equivalentes.',
  },
  {
    title: 'Cancelaciones',
    text: 'Las condiciones de cancelación deberán informarse antes de contratar. Cualquier cargo o retención debe tener fundamento contractual y respetar la legislación de protección al consumidor.',
  },
  {
    title: 'Reembolsos y controversias',
    text: 'Las reclamaciones deben evaluarse según el servicio, la evidencia disponible, las condiciones aceptadas y los derechos legales de las partes. Las reglas operativas específicas deben publicarse antes de habilitar cobros reales.',
  },
];

type LegalSection = {
  title: string;
  text: string;
};

export default function HelpScreen() {
  const router = useRouter();
  const { tema } = useLocalSearchParams<{
    tema?: string;
  }>();

  const topic =
    tema && Object.hasOwn(topics, tema)
      ? topics[tema]
      : topics.ayuda;

  const link = topic.link;
  const { colors } = useTekoraTheme();

  // Esta condición afecta solo a la presentación.
  // Los otros temas conservan sus rutas originales.

if (tema === 'pagos') {
  return (
    <ModuleScreen
      title="Métodos de pago"
      themeColors={colors}
    >
      <View
        style={[
          legalStyles.intro,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={34}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.introTitle,
            { color: colors.text },
          ]}
        >
          Tu seguridad es nuestra prioridad
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            {
              color: colors.muted,
              textAlign: 'center',
            },
          ]}
        >
          Conoce cómo están previstos los medios de pago,
          las condiciones de contratación y la
          protección de los usuarios de Tekora.
        </Text>

        <Text
          style={[
            legalStyles.draft,
            {
              backgroundColor: colors.accent,
              color: colors.primary,
            },
          ]}
        >
          Información de pagos
        </Text>
      </View>

      <View
        style={[
          legalStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="card-outline"
          size={28}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Tarjeta bancaria
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Método de pago electrónico contemplado
          para futuras operaciones habilitadas.
          No se registran tarjetas desde esta pantalla.
        </Text>
      </View>

      <View
        style={[
          legalStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="cash-outline"
          size={28}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Efectivo
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Alternativa contemplada para servicios
          seleccionados, sujeta a las condiciones
          que se comuniquen durante la contratación.
        </Text>
      </View>

      <LegalGroup
        icon="document-text-outline"
        title="Condiciones de pago y contratación"
        sections={condicionesPago}
      />

      <View
        style={[
          legalStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={24}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Aviso importante
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Esta sección tiene fines informativos
          y no permite efectuar pagos, registrar
          tarjetas bancarias ni solicitar reembolsos
          directamente.
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Las condiciones definitivas de cobro y
          devolución se publicarán cuando dichos
          servicios estén habilitados.
        </Text>
      </View>
    </ModuleScreen>
  );
}

if (tema === 'pagos') {
  return (
    <ModuleScreen
      title="Métodos de pago"
      themeColors={colors}
    >
      <View
        style={[
          legalStyles.intro,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={34}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.introTitle,
            { color: colors.text },
          ]}
        >
          Tu seguridad es nuestra prioridad
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            {
              color: colors.muted,
              textAlign: 'center',
            },
          ]}
        >
          Conoce cómo están previstos los medios de pago,
          las condiciones de contratación y la
          protección de los usuarios de Tekora.
        </Text>

        <Text
          style={[
            legalStyles.draft,
            {
              backgroundColor: colors.accent,
              color: colors.primary,
            },
          ]}
        >
          Información de pagos
        </Text>
      </View>

      <View
        style={[
          legalStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="card-outline"
          size={28}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Tarjeta bancaria
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Método de pago electrónico contemplado
          para futuras operaciones habilitadas.
          No se registran tarjetas desde esta pantalla.
        </Text>
      </View>

      <View
        style={[
          legalStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="cash-outline"
          size={28}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Efectivo
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Alternativa contemplada para servicios
          seleccionados, sujeta a las condiciones
          que se comuniquen durante la contratación.
        </Text>
      </View>

      <LegalGroup
        icon="document-text-outline"
        title="Condiciones de pago y contratación"
        sections={condicionesPago}
      />

      <View
        style={[
          legalStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={24}
          color={colors.primary}
        />

        <Text
          style={[
            legalStyles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Aviso importante
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Esta sección tiene fines informativos
          y no permite efectuar pagos, registrar
          tarjetas bancarias ni solicitar reembolsos
          directamente.
        </Text>

        <Text
          style={[
            legalStyles.paragraph,
            { color: colors.muted },
          ]}
        >
          Las condiciones definitivas de cobro y
          devolución se publicarán cuando dichos
          servicios estén habilitados.
        </Text>
      </View>
    </ModuleScreen>
  );
}


  if (tema === 'privacidad') {
    return (
      <ModuleScreen
        title="Términos y privacidad"
        themeColors={colors}
      >
        <View
          style={[
            legalStyles.intro,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={34}
            color={colors.primary}
          />

          <Text
            style={[
              legalStyles.introTitle,
              { color: colors.text },
            ]}
          >
            Tu confianza es importante
          </Text>

          <Text
            style={[
              legalStyles.paragraph,
              { color: colors.muted },
            ]}
          >
            Conoce las reglas de uso de Tekora
            y cómo debe protegerse tu información.
          </Text>

         
          
        </View>

        <LegalGroup
          icon="document-text-outline"
          title="Términos y condiciones"
          sections={condiciones}
        />

        <LegalGroup
          icon="lock-closed-outline"
          title="Aviso de privacidad"
          sections={privacidad}
        />

        <LegalGroup
          icon="receipt-outline"
          title="Políticas de contratación"
          sections={contratacion}
        />

        <View
          style={[
            legalStyles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              legalStyles.sectionTitle,
              { color: colors.text },
            ]}
          >
            Contacto y atención
          </Text>

          <Text
            style={[
              legalStyles.paragraph,
              { color: colors.muted },
            ]}
          >
            El responsable de Tekora deberá
            publicar aquí su razón social,
            domicilio de contacto y un correo
            oficial para consultas, reclamaciones
            y ejercicio de derechos ARCO.
          </Text>

          <Text
            style={[
              legalStyles.paragraph,
              { color: colors.muted },
            ]}
          >
            Versión: borrador 0.1
          </Text>
        </View>
      </ModuleScreen>
    );
  }

  // Comportamiento original de las demás secciones.
  return (
    <ModuleScreen title={topic.title} themeColors={colors}>
      <View
        style={[
          ui.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            ui.text,
            { color: colors.muted },
          ]}
        >
          {topic.text}
        </Text>

        {link && (
          <ReservationButton
            label={link.label}
            onPress={() => router.push(link.href)}
          />
        )}
      </View>
    </ModuleScreen>
  );
}


const condicionesPago = [
  {
    title: '1. Información general',
    text: 'Tekora contempla distintos mecanismos para facilitar la contratación de servicios entre solicitantes y prestadores. Los métodos de pago habilitados deberán informarse durante el proceso de reserva correspondiente.',
  },
  {
    title: '2. Tarjetas bancarias',
    text: 'El pago electrónico mediante tarjeta está previsto como una alternativa de contratación. Su disponibilidad dependerá de la habilitación de un servicio de procesamiento autorizado. Esta pantalla no solicita, almacena ni procesa información bancaria.',
  },
  {
    title: '3. Pagos en efectivo',
    text: 'El efectivo se contempla como una modalidad limitada a determinados servicios y condiciones operativas. Cuando se encuentre disponible, el usuario deberá conocer las instrucciones y condiciones antes de confirmar.',
  },
  {
    title: '4. Transparencia de precios',
    text: 'Los precios de los servicios deberán mostrarse en pesos mexicanos (MXN). Antes de confirmar una contratación, el usuario deberá conocer el importe total, los conceptos incluidos y cualquier cargo adicional que resulte aplicable.',
  },
  {
    title: '5. Confirmación de operaciones',
    text: 'La contratación de un servicio y la confirmación de un pago son eventos distintos. Una solicitud de reserva no representa necesariamente un pago realizado. Tekora deberá informar el estado de cada operación de manera clara.',
  },
  {
    title: '6. Protección de información financiera',
    text: 'Los datos utilizados para operaciones financieras deberán tratarse conforme a las medidas de seguridad y disposiciones legales aplicables. Tekora no debe solicitar contraseñas bancarias, NIP ni códigos confidenciales mediante conversaciones entre usuarios.',
  },
  {
    title: '7. Cancelaciones',
    text: 'Las condiciones de cancelación deberán comunicarse antes de contratar. La procedencia de cargos, devoluciones o ajustes dependerá de las condiciones aceptadas, de las circunstancias del servicio y de la legislación aplicable.',
  },
  {
    title: '8. Reembolsos',
    text: 'Las solicitudes de reembolso deberán revisarse individualmente considerando la evidencia disponible, las condiciones de contratación y los derechos legales del consumidor. No se establece en este documento un plazo automático de devolución.',
  },
  {
    title: '9. Aclaraciones y controversias',
    text: 'Los usuarios podrán solicitar información o presentar aclaraciones sobre importes y operaciones mediante los canales oficiales de atención que Tekora habilite. Las controversias deberán atenderse respetando los derechos establecidos por la legislación mexicana.',
  },
  {
    title: '10. Responsabilidades',
    text: 'Los prestadores deberán respetar las condiciones económicas aceptadas. Los solicitantes deberán verificar el importe y las condiciones antes de confirmar. Las responsabilidades de cada parte deberán establecerse en los términos y condiciones oficiales.',
  },
  {
    title: '11. Prevención de fraudes',
    text: 'Se recomienda evitar pagos solicitados mediante canales no autorizados, no compartir credenciales bancarias y verificar siempre las condiciones de contratación. Las operaciones sospechosas deberán reportarse mediante los canales oficiales disponibles.',
  },
  {
    title: '12. Marco legal aplicable',
    text: 'Las operaciones comerciales deberán cumplir las disposiciones mexicanas aplicables, incluyendo la Ley Federal de Protección al Consumidor y la legislación correspondiente al tratamiento de datos personales.',
  },
];


function LegalGroup({
  icon,
  title,
  sections,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sections: LegalSection[];
}) {
  const { colors } = useTekoraTheme();

  return (
    <View style={legalStyles.group}>
      <View style={legalStyles.groupHeader}>
        <Ionicons
          name={icon}
          size={23}
          color={colors.primary}
        />

        <Text
          accessibilityRole="header"
          style={[
            legalStyles.groupTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>
      </View>

      {sections.map(section => (
        <View
          key={section.title}
          style={[
            legalStyles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              legalStyles.sectionTitle,
              { color: colors.text },
            ]}
          >
            {section.title}
          </Text>

          <Text
            style={[
              legalStyles.paragraph,
              { color: colors.muted },
            ]}
          >
            {section.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const legalStyles = StyleSheet.create({
  intro: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },

  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  draft: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },

  group: {
    gap: 12,
    marginTop: 12,
  },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },

  groupTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: 'bold',
  },

  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 22,
  },
});
