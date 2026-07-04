type AuthEmailTemplate = "ConfirmAccountEmail" | "ResetPasswordEmail";

type AuthEmailProps = {
  email: string;
  actionUrl: string;
  appUrl: string;
};

type RenderedEmail =
  | string
  | {
      html: string;
      subject?: string;
    };

function renderedEmailToString(result: RenderedEmail) {
  return typeof result === "string" ? result : result.html;
}

export async function renderAuthEmail(
  template: AuthEmailTemplate,
  props: AuthEmailProps,
) {
  const [htmlResult, textResult] = await Promise.all([
    renderEmailComponent(template, props, { pretty: true }),
    renderEmailComponent(template, props, { plainText: true }),
  ]);

  return {
    html: renderedEmailToString(htmlResult),
    text: renderedEmailToString(textResult),
  };
}
