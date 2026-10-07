import { render } from "@testing-library/react";
import { MemoryRouter, useLocation, type Location } from "react-router-dom";
import { AppRoutes } from "../App";

// Renders the app's real route table at `path`, the way a browser opening that address
// would. The calling test file mocks the socket module. `address()` is what the address
// bar would show now (path, query and fragment).
export function renderAt(path: string) {
  let location: Location | undefined;
  function AddressProbe() {
    location = useLocation();
    return null;
  }
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <AddressProbe />
    </MemoryRouter>,
  );
  const address = () => `${location!.pathname}${location!.search}${location!.hash}`;
  return { ...result, address };
}
