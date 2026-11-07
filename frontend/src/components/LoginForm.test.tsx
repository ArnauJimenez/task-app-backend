import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("renders the login form and registration option", () => {
    const markup = renderToStaticMarkup(<LoginForm onLoginSuccess={() => {}} />);

    expect(markup).toContain("TaskApp Login");
    expect(markup).toContain("Correo electrónico");
    expect(markup).toContain("Contraseña");
    expect(markup).toContain("¿No tienes cuenta? Regístrate gratis");
  });
});
