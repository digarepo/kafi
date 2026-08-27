import { Fragment } from "react";
import { Link, matchPath, useMatches } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@kafi/ui";

import { routeRegistry, type RouteMeta } from "../routing";

function findMeta(pathname: string): RouteMeta | undefined {
  return [...routeRegistry]
    .sort((a, b) => b.path.length - a.path.length)
    .find((route) => Boolean(matchPath({ path: route.path, end: true }, pathname)));
}

/**
 * Renders the current page breadcrumb trail based on the matched route hierarchy.
 *
 * Labels are resolved from the route registry metadata. Dynamic segments fall
 * back to a humanized version of the URL segment.
 */
export function AppBreadcrumbs() {
  const matches = useMatches();
  const pathnames = matches
    .map((match) => match.pathname)
    .filter((pathname, index, self) => self.indexOf(pathname) === index)
    .filter((pathname) => pathname !== "/");

  if (pathnames.length === 0) {
    return null;
  }

  const items = pathnames
    .map((pathname) => {
      const meta = findMeta(pathname);
      return {
        path: pathname,
        label: meta?.breadcrumb?.label ?? meta?.title ?? formatSegment(pathname),
      };
    })
    .filter((item, index, all) => index === 0 || item.label !== all[index - 1].label);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.path}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={item.path} />}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function formatSegment(pathname: string): string {
  const segment = pathname.split("/").pop() ?? pathname;
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
