import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { defineMessages, FormattedMessage, MessageDescriptor, useIntl } from "react-intl";
import { Nav, Navbar, Button, Fade } from "react-bootstrap";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { LinkContainer } from "react-router-bootstrap";
import { Link, NavLink, useLocation, useHistory } from "react-router-dom";
import Mousetrap from "mousetrap";
import SessionUtils from "src/utils/session";
import { Icon } from "src/components/Shared/Icon";
import { ConfigurationContext } from "src/hooks/Config";
import { ManualStateContext } from "./Help/context";
import { SettingsButton } from "./SettingsButton";
import {
  faBars,
  faChartColumn,
  faFilm,
  faHeart,
  faImage,
  faImages,
  faMapMarkerAlt,
  faPlayCircle,
  faQuestionCircle,
  faSignOutAlt,
  faTag,
  faTimes,
  faUser,
  faVideo,
  faHome,
  faBox,
} from "@fortawesome/free-solid-svg-icons";
import { baseURL } from "src/core/createClient";
import { PatchComponent } from "src/patch";
import { SearchBox } from "./SearchBox";

interface IMenuItem {
  name: string;
  message: MessageDescriptor;
  href: string;
  icon: IconDefinition;
  hotkey: string;
  userCreatable?: boolean;
}
const messages = defineMessages({
  home: {
    id: "home",
    defaultMessage: "Home",
  },
  recommendations: {
    id: "recommendations",
    defaultMessage: "Recommendations"
  },
  scenes: {
    id: "scenes",
    defaultMessage: "Scenes",
  },
  images: {
    id: "images",
    defaultMessage: "Images",
  },
  groups: {
    id: "groups",
    defaultMessage: "Groups",
  },
  markers: {
    id: "markers",
    defaultMessage: "Markers",
  },
  performers: {
    id: "performers",
    defaultMessage: "Performers",
  },
  studios: {
    id: "studios",
    defaultMessage: "Studios",
  },
  tags: {
    id: "tags",
    defaultMessage: "Tags",
  },
  galleries: {
    id: "galleries",
    defaultMessage: "Galleries",
  },
  sceneTagger: {
    id: "sceneTagger",
    defaultMessage: "Scene Tagger",
  },
  donate: {
    id: "donate",
    defaultMessage: "Donate",
  },
  statistics: {
    id: "statistics_short",
    defaultMessage: "Stats",
  },
});

const allMenuItems: IMenuItem[] = [
  {
    name: "home",
    message: messages.home,
    href: "/",
    icon: faHome,
    hotkey: "g hx",
    userCreatable: false,
  },
  {
    name: "recommendations",
    message: messages.recommendations,
    href: "/recommendations",
    icon: faPlayCircle,
    hotkey: "g hr",
  },
  {
    name: "scenes",
    message: messages.scenes,
    href: "/scenes",
    icon: faPlayCircle,
    hotkey: "g s",
    userCreatable: true,
  },
  {
    name: "images",
    message: messages.images,
    href: "/images",
    icon: faImage,
    hotkey: "g i",
  },
  {
    name: "groups",
    message: messages.groups,
    href: "/groups",
    icon: faFilm,
    hotkey: "g v",
    userCreatable: true,
  },
  {
    name: "markers",
    message: messages.markers,
    href: "/scenes/markers",
    icon: faMapMarkerAlt,
    hotkey: "g k",
  },
  {
    name: "galleries",
    message: messages.galleries,
    href: "/galleries",
    icon: faImages,
    hotkey: "g l",
    userCreatable: true,
  },
  {
    name: "performers",
    message: messages.performers,
    href: "/performers",
    icon: faUser,
    hotkey: "g p",
    userCreatable: true,
  },
  {
    name: "studios",
    message: messages.studios,
    href: "/studios",
    icon: faVideo,
    hotkey: "g u",
    userCreatable: true,
  },
  {
    name: "tags",
    message: messages.tags,
    href: "/tags",
    icon: faTag,
    hotkey: "g t",
    userCreatable: true,
  },
  { name: "stats", 
    message: messages.statistics,
    href: "/stats",
    icon: faChartColumn,
    hotkey: "i",
    userCreatable: true,
  }
];

const newPathsList = allMenuItems
  .filter((item) => item.userCreatable)
  .map((item) => item.href);

const MainNavbarMenuItems = PatchComponent(
  "MainNavBar.MenuItems",
  (props: React.PropsWithChildren<{}>) => {
    return <Nav>{props.children}</Nav>;
  }
);

const MainNavbarUtilityItems = PatchComponent(
  "MainNavBar.UtilityItems",
  (props: React.PropsWithChildren<{}>) => {
    return <>{props.children}</>;
  }
);

export const MainNavbar: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { configuration, loading } = React.useContext(ConfigurationContext);
  const { openManual } = React.useContext(ManualStateContext);

  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // New state for visibility


  // Show all menu items by default, unless config says otherwise
  const menuItems = useMemo(() => {
    let cfgMenuItems = configuration?.interface.menuItems;
    if (!cfgMenuItems) {
      return allMenuItems;
    }

    // translate old movies menu item to groups
    cfgMenuItems = cfgMenuItems.map((item) => {
      if (item === "movies") {
        return "groups";
      }
      return item;
    });

    return allMenuItems.filter((menuItem) =>
      cfgMenuItems!.includes(menuItem.name)
    );
  }, [configuration]);

  // react-bootstrap typing bug
  const navbarRef = useRef<HTMLElement | null>(null);
  const intl = useIntl();

  const maybeCollapse = useCallback(
    (event: Event) => {
      if (
        navbarRef.current &&
        event.target instanceof Node &&
        !navbarRef.current.contains(event.target)
      ) {
        setExpanded(false);
      }
    },
    [setExpanded]
  );

  useEffect(() => {
    if (expanded) {
      document.addEventListener("click", maybeCollapse);
      document.addEventListener("touchstart", maybeCollapse);
    }
    return () => {
      document.removeEventListener("click", maybeCollapse);
      document.removeEventListener("touchstart", maybeCollapse);
    };
  }, [expanded, maybeCollapse]);

  const goto = useCallback(
    (page: string) => {
      history.push(page);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    [history]
  );

  useEffect(() => {
    let lastScrollTop = 0;
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > lastScrollTop) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const pathname = location.pathname.replace(/\/$/, "");
  let newPath = newPathsList.includes(pathname) ? `${pathname}/new` : null;
  if (newPath !== null) {
    let queryParam = new URLSearchParams(location.search).get("q");
    if (queryParam) {
      newPath += "?q=" + encodeURIComponent(queryParam);
    }
  }

  function maybeRenderLogout() {
    if (SessionUtils.isLoggedIn()) {
      return (
        <Button
          className="minimal logout-button d-flex align-items-center"
          href={`${baseURL}logout`}
          title={intl.formatMessage({ id: "actions.logout" })}
        >
          <Icon icon={faSignOutAlt} />
        </Button>
      );
    }
  }

  const handleDismiss = useCallback(() => setExpanded(false), [setExpanded]);

  function renderUtilityButtons() {
    return (
      <>
        <NavLink
          className="nav-utility"
          exact
          to="/settings"
          onClick={handleDismiss}
        >
          <SettingsButton />
        </NavLink>
        {maybeRenderLogout()}
      </>
    );
  }
return (
    <Navbar
      collapseOnSelect
      fixed="top"
      variant="dark"
      bg="dark"
      className={`top-nav${isVisible ? ' visible' : ' hidden'}`}
      expand="xl"
      expanded={expanded}
      onToggle={setExpanded}
      ref={navbarRef}
    >
      <Navbar.Brand as="div" onClick={handleDismiss}>
        <Link to="/">
          <Button className="minimal brand-link d-inline-block">
            <Icon icon={faBox} className="mr-2" />
            Stash
          </Button>
        </Link>
      </Navbar.Brand>

      <div className="search-container">
        <SearchBox />
      </div>

      <Nav className="navbar-buttons flex-row ml-auto order-xl-2">
        {!!newPath && (
          <div className="mr-2">
            <Link to={newPath}>
              <Button variant="primary">
                <FormattedMessage id="new" defaultMessage="New" />
              </Button>
            </Link>
          </div>
        )}
        <MainNavbarUtilityItems>
          {renderUtilityButtons()}
        </MainNavbarUtilityItems>
        <Navbar.Toggle className="nav-menu-toggle ml-sm-2">
          <Icon icon={expanded ? faTimes : faBars} />
        </Navbar.Toggle>
      </Nav>
    </Navbar>
  );
};
