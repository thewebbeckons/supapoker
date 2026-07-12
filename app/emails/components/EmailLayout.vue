<script setup lang="ts">
const props = defineProps<{
  title: string;
  preview: string;
  actionLabel: string;
  actionUrl: string;
  appUrl: string;
  userEmail?: string;
  note?: string;
}>();

const fontStack =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const bodyStyle = {
  margin: "0",
  padding: "0",
  backgroundColor: "#09090b",
  fontFamily: fontStack,
};

const containerStyle = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 12px",
};

const panelStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  backgroundColor: "#0d0d10",
  border: "1px solid #27272a",
  borderTop: "2px solid #2563eb",
};

const mastheadStyle = {
  padding: "20px 28px",
  borderBottom: "1px solid #27272a",
};

const brandStyle = {
  margin: "0",
  color: "#f4f4f5",
  fontFamily: fontStack,
  fontSize: "16px",
  fontWeight: "600",
  lineHeight: "1.25",
  letterSpacing: "-0.04em",
};

const brandAccentStyle = {
  color: "#3b82f6",
};

const contentStyle = {
  padding: "32px 28px 28px",
};

const recipientStyle = {
  margin: "0 0 8px",
  color: "#62626c",
  fontFamily: fontStack,
  fontSize: "11px",
  fontWeight: "400",
  lineHeight: "1.5",
  letterSpacing: "0.02em",
  wordBreak: "break-all" as const,
};

const headingStyle = {
  margin: "0 0 18px",
  color: "#f4f4f5",
  fontFamily: fontStack,
  fontSize: "26px",
  fontWeight: "500",
  lineHeight: "1.3",
  letterSpacing: "-0.05em",
};

const actionWrapStyle = {
  margin: "22px 0 20px",
};

const buttonStyle = {
  backgroundColor: "#2563eb",
  border: "1px solid #60a5fa",
  borderRadius: "0",
  color: "#ffffff",
  fontFamily: fontStack,
  fontSize: "13px",
  fontWeight: "600",
  padding: "11px 16px",
  boxShadow: "0 0 24px rgba(37, 99, 235, 0.16)",
};

const noteTextStyle = {
  margin: "0 0 20px",
  paddingLeft: "12px",
  borderLeft: "2px solid #2563eb",
  color: "#8b8b95",
  fontFamily: fontStack,
  fontSize: "12px",
  lineHeight: "1.6",
};

const fallbackStyle = {
  margin: "0",
  color: "#62626c",
  fontFamily: fontStack,
  fontSize: "12px",
  lineHeight: "1.6",
};

const linkStyle = {
  color: "#60a5fa",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const footerStyle = {
  margin: "16px 12px 0",
  color: "#52525b",
  fontFamily: fontStack,
  fontSize: "12px",
  lineHeight: "1.6",
  textAlign: "center" as const,
};
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>{{ title }}</title>
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <EStyle>
        @media only screen and (max-width: 600px) {
          .email-container { padding: 12px 8px !important; }
          .email-masthead { padding: 16px !important; }
          .email-content { padding: 24px 16px 20px !important; }
          .email-heading { font-size: 22px !important; }
        }
      </EStyle>
    </EHead>
    <EPreview>{{ preview }}</EPreview>
    <EBody :style="bodyStyle">
      <EContainer class="email-container" :style="containerStyle">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" :style="panelStyle">
          <tbody>
            <tr>
              <td class="email-masthead" :style="mastheadStyle">
                <p :style="brandStyle">
                  SupaPoker<span :style="brandAccentStyle">.</span>
                </p>
              </td>
            </tr>
            <tr>
              <td class="email-content" :style="contentStyle">
                <p v-if="userEmail" :style="recipientStyle">
                  {{ userEmail }}
                </p>
                <EHeading class="email-heading" as="h1" :style="headingStyle">
                  {{ title }}
                </EHeading>

                <slot />

                <p :style="actionWrapStyle">
                  <EButton :href="actionUrl" target="_blank" :style="buttonStyle">
                    {{ actionLabel }}
                  </EButton>
                </p>

                <p v-if="note" :style="noteTextStyle">
                  {{ note }}
                </p>

                <p :style="fallbackStyle">
                  Button not working? Copy and paste this link:<br>
                  <a :href="actionUrl" target="_blank" :style="linkStyle">{{ actionUrl }}</a>
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        <p :style="footerStyle">
          Sent by <a :href="appUrl" target="_blank" :style="linkStyle">SupaPoker</a>.
          Fast rooms, blind votes, and clear story estimates.
        </p>
      </EContainer>
    </EBody>
  </EHtml>
</template>
