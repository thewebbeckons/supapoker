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
  backgroundColor: "#f4f4f5",
  fontFamily: fontStack,
};

const containerStyle = {
  maxWidth: "640px",
  margin: "0 auto",
  padding: "28px 18px",
};

const panelStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  backgroundColor: "#ffffff",
  border: "1px solid #d4d4d8",
  boxShadow: "0 10px 28px rgba(24, 24, 27, 0.08)",
};

const mastheadStyle = {
  padding: "20px 22px",
  backgroundColor: "#18181b",
  borderBottom: "4px solid #2563eb",
};

const brandStyle = {
  margin: "0",
  color: "#ffffff",
  fontFamily: fontStack,
  fontSize: "18px",
  fontWeight: "800",
  lineHeight: "1.2",
};

const betaStyle = {
  margin: "6px 0 0",
  color: "#93c5fd",
  fontFamily: fontStack,
  fontSize: "12px",
  lineHeight: "1.4",
};

const contentStyle = {
  padding: "30px 24px 28px",
};

const recipientStyle = {
  margin: "0 0 12px",
  color: "#2563eb",
  fontFamily: fontStack,
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: "1.5",
  wordBreak: "break-all" as const,
};

const headingStyle = {
  margin: "0 0 18px",
  color: "#18181b",
  fontFamily: fontStack,
  fontSize: "30px",
  fontWeight: "800",
  lineHeight: "1.2",
};

const actionWrapStyle = {
  margin: "24px 0 22px",
};

const buttonStyle = {
  backgroundColor: "#2563eb",
  border: "1px solid #1d4ed8",
  borderRadius: "0",
  color: "#ffffff",
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: "800",
  padding: "13px 18px",
};

const noteTableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  margin: "8px 0 22px",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
};

const noteCellStyle = {
  padding: "14px 16px",
};

const noteTextStyle = {
  margin: "0",
  color: "#1e3a8a",
  fontFamily: fontStack,
  fontSize: "13px",
  lineHeight: "1.7",
};

const fallbackStyle = {
  margin: "0",
  color: "#52525b",
  fontFamily: fontStack,
  fontSize: "12px",
  lineHeight: "1.7",
};

const linkStyle = {
  color: "#2563eb",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const footerStyle = {
  margin: "18px 0 0",
  color: "#71717a",
  fontFamily: fontStack,
  fontSize: "12px",
  lineHeight: "1.7",
  textAlign: "center" as const,
};
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>{{ title }}</title>
    </EHead>
    <EPreview>{{ preview }}</EPreview>
    <EBody :style="bodyStyle">
      <EContainer :style="containerStyle">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" :style="panelStyle">
          <tbody>
            <tr>
              <td :style="mastheadStyle">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td>
                        <p :style="brandStyle">
                          SupaPoker
                        </p>
                        <p :style="betaStyle">
                          Planning poker for focused teams
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td :style="contentStyle">
                <p v-if="userEmail" :style="recipientStyle">
                  {{ userEmail }}
                </p>
                <EHeading as="h1" :style="headingStyle">
                  {{ title }}
                </EHeading>

                <slot />

                <p :style="actionWrapStyle">
                  <EButton :href="actionUrl" target="_blank" :style="buttonStyle">
                    {{ actionLabel }}
                  </EButton>
                </p>

                <table
                  v-if="note"
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  :style="noteTableStyle"
                >
                  <tbody>
                    <tr>
                      <td :style="noteCellStyle">
                        <p :style="noteTextStyle">
                          {{ note }}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

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
