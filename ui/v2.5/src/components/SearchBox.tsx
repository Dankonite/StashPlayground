import { faTimes } from "@fortawesome/free-solid-svg-icons";
import React, { useEffect, useState } from "react";
import { Button, FormControl } from "react-bootstrap";
import * as GQL from "src/core/generated-graphql";
import { Icon } from "./Shared/Icon";
import useFocus from "src/utils/focus";
import Fuse from "fuse.js"
import { PerformerCard } from "./Performers/PerformerCard";
import { TagCard } from "./Tags/TagCard";
import { SceneCard } from "./Scenes/SceneCard";
import { StudioCard } from "./Studios/StudioCard";
import { GalleryCard } from "./Galleries/GalleryCard";
import { GroupCard } from "./Groups/GroupCard";
import Mousetrap from "mousetrap";
import { useHistory } from "react-router-dom";
import { Link } from "react-router-dom";
import { useIntl } from "react-intl";
import './SearchBox.scss';

interface SBProps {}

const categories = [
    { id: "performers", label: "Performers", route: "/performers" },
    { id: "scenes", label: "Scenes", route: "/scenes" },
    { id: "galleries", label: "Galleries", route: "/galleries" },
    { id: "studios", label: "Studios", route: "/studios" },
    { id: "tags", label: "Tags", route: "/tags" },
    { id: "groups", label: "Movies", route: "/groups" },
];

export const SearchBox: React.FC<SBProps> = () => {
    const intl = useIntl();
    const history = useHistory();
    const [searchTerm, setSearch] = useState("");
    const [queryRef, setQueryFocus] = useFocus();
    const [queryClearShowing, setQueryClearShowing] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isResultsVisible, setIsResultsVisible] = useState(false);

    type SearchResult = { 
        ShortName: string; 
        TypeData: GQL.SlimSceneDataFragment | GQL.PerformerDataFragment | 
                 GQL.TagDataFragment | GQL.StudioDataFragment |
                 GQL.SlimGalleryDataFragment | GQL.GroupDataFragment 
    };

    // Keyboard shortcuts
    useEffect(() => {
        Mousetrap.bind('shift+s', (e) => {
            const SearchBox = (document.getElementById("SearchBox") as HTMLInputElement);
            if ((document.activeElement as HTMLInputElement) === SearchBox) return;
            e.preventDefault();
            SearchBox?.focus();
            SearchBox.value = "";
            setSearch("");
        });

        Mousetrap.bind('escape', (e) => {
            setIsSearchActive(false);
            (document.getElementById("SearchBox") as HTMLInputElement).blur();
            (document.getElementById("SearchBox") as HTMLInputElement).value = "";
            setSearch("");
        });

        Mousetrap.bind('enter', (e) => {
            if (searchTerm === "") return;
            goToFirstResult();
            (document.getElementById("SearchBox") as HTMLInputElement).blur();
            (document.getElementById("SearchBox") as HTMLInputElement).value = "";
            setSearch("");
        });

        return () => {
            Mousetrap.unbind(['shift+s', 'escape', 'enter']);
        };
    }, [searchTerm]);

    // Update search active state
    useEffect(() => {
        setIsSearchActive(searchTerm !== "");
    }, [searchTerm]);

    useEffect(() => {
        const handleScroll = () => {
            const searchResults = document.querySelector('.search-results');
            const navElement = document.querySelector('nav');
            
            if (searchResults && navElement) {
                const isVisible = searchResults.classList.contains('Searching') && 
                                searchResults.getBoundingClientRect().top + window.scrollY >= 0;
                
                if (isVisible) {
                    navElement.classList.add('search-active');
                    setIsResultsVisible(true);
                } else {
                    navElement.classList.remove('search-active');
                    setIsResultsVisible(false);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [searchTerm]); // Add searchTerm as dependency

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.contains(event.target as Node)) {
                setSearch("");
                if (queryRef.current) queryRef.current.value = "";
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Query handlers
    function onChangeQuery(event: React.FormEvent<HTMLInputElement>) {
        setSearch(event.currentTarget.value);
        setSearchResults([]);
    }

    function onClearQuery() {
        if (queryRef.current) queryRef.current.value = "";
        setSearch("");
        setQueryFocus();
        setQueryClearShowing(false);
        setSearchResults([]);
        setIsResultsVisible(false);
        
        const navElement = document.querySelector('nav');
        if (navElement) navElement.classList.remove('search-active');
    }

    // Click outside handler update
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.contains(event.target as Node)) {
                setSearch("");
                if (queryRef.current) queryRef.current.value = "";
                setIsResultsVisible(false);
                
                const navElement = document.querySelector('nav');
                if (navElement) navElement.classList.remove('search-active');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // GraphQL queries
    const { data: sceneData } = GQL.useFindScenesQuery({
        variables: {
            filter: {
                per_page: searchTerm !== "" ? 40 : 0,
                q: searchTerm
            },
            scene_filter: {
                title: {
                    modifier: GQL.CriterionModifier.NotNull,
                    value: ""
                }
            }
        }
    });

    const { data: perfData } = GQL.useFindPerformersQuery({
        variables: {
            filter: {
                per_page: searchTerm !== "" ? 40 : 0,
                q: searchTerm
            }
        }
    });

    const { data: tagData } = GQL.useFindTagsQuery({
        variables: {
            filter: {
                per_page: searchTerm !== "" ? 40 : 0,
                q: searchTerm
            }
        }
    });

    const { data: studioData } = GQL.useFindStudiosQuery({
        variables: {
            filter: {
                per_page: searchTerm !== "" ? 40 : 0,
                q: searchTerm
            }
        }
    });

    const { data: galleryData } = GQL.useFindGalleriesQuery({
        variables: {
            filter: {
                per_page: searchTerm !== "" ? 40 : 0,
                q: searchTerm
            },
            gallery_filter: {
                title: {
                    modifier: GQL.CriterionModifier.NotNull,
                    value: ""
                }
            }
        }
    });

    const { data: movieData } = GQL.useFindGroupsQuery({
        variables: {
            filter: {
                per_page: searchTerm !== "" ? 40 : 0,
                q: searchTerm
            },
            group_filter: {
                name: {
                    modifier: GQL.CriterionModifier.NotNull,
                    value: ""
                }
            }
        }
    });
    // Process search results
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }

        let results: SearchResult[] = [];

        if (sceneData?.findScenes.scenes) {
            results.push(...sceneData.findScenes.scenes.map(scene => ({
                ShortName: scene.title!,
                TypeData: scene
            })));
        }

        if (perfData?.findPerformers.performers) {
            results.push(...perfData.findPerformers.performers.map(perf => ({
                ShortName: perf.name,
                TypeData: perf
            })));
        }

        if (tagData?.findTags.tags) {
            results.push(...tagData.findTags.tags.map(tag => ({
                ShortName: tag.name,
                TypeData: tag
            })));
        }

        if (studioData?.findStudios.studios) {
            results.push(...studioData.findStudios.studios.map(studio => ({
                ShortName: studio.name!,
                TypeData: studio
            })));
        }

        if (galleryData?.findGalleries.galleries) {
            results.push(...galleryData.findGalleries.galleries.map(gallery => ({
                ShortName: gallery.title!,
                TypeData: gallery
            })));
        }

        if (movieData?.findGroups.groups) {
            results.push(...movieData.findGroups.groups.map(movie => ({
                ShortName: movie.name!,
                TypeData: movie
            })));
        }

        const fuse = new Fuse(results, {
            keys: ['ShortName'],
            shouldSort: true,
            threshold: 0.4,
        });

        setSearchResults(fuse.search(searchTerm).map(({ item }) => item));
    }, [searchTerm, sceneData, perfData, tagData, studioData, galleryData, movieData]);

    function goToFirstResult() {
        if (searchResults.length === 0) return;
        
        const firstResult = searchResults[0];
        history.push(`/${
            firstResult.TypeData.__typename === "Tag" ? "tags" :
            firstResult.TypeData.__typename === "Performer" ? "performers" :
            firstResult.TypeData.__typename === "Scene" ? "scenes" :
            firstResult.TypeData.__typename === "Studio" ? "studios" :
            firstResult.TypeData.__typename === "Gallery" ? "galleries" :
            firstResult.TypeData.__typename === "Group" ? "movies" :
            ""
        }/${firstResult.TypeData.id}`);
    }

    // Categorize results
    const performers = searchResults.filter(sResult => sResult.TypeData.__typename === "Performer");
    const tags = searchResults.filter(sResult => sResult.TypeData.__typename === "Tag");
    const scenes = searchResults.filter(sResult => sResult.TypeData.__typename === "Scene");
    const studios = searchResults.filter(sResult => sResult.TypeData.__typename === "Studio");
    const galleries = searchResults.filter(sResult => sResult.TypeData.__typename === "Gallery");
    const movies = searchResults.filter(sResult => sResult.TypeData.__typename === "Group");

    useEffect(() => {
        // Add or remove the search-active class to the nav element
        const navElement = document.querySelector('nav');
        if (navElement) {
            if (searchTerm !== "") {
                navElement.classList.add('search-active');
            } else {
                navElement.classList.remove('search-active');
            }
        }
    }, [searchTerm]);

    return (
        <div className="search-container">
            <div className="d-flex flex-row SearchBox">
                <FormControl
                    ref={queryRef}
                    id="SearchBox"
                    placeholder="Search"
                    autoComplete="off"
                    defaultValue=""
                    onInput={onChangeQuery}
                    className="query-text-field search-box-input bg-secondary text-white border-secondary mousetrap"
                />
                <Button
                    variant="secondary"
                    onClick={onClearQuery}
                    className={`search-clear ${searchTerm !== "" ? "" : "d-none"}`}
                >
                    <Icon icon={faTimes} />
                </Button>
                {/* Search Results */}
                <div className={`search-results ${searchTerm !== "" ? "Searching" : "hide"}`}>
                    <div className="search-results-grid">
                        {/* Performers Section */}
                        <div className="performers-category category">
                            <Link to="/performers" className="category-link">
                                <h5>Performers</h5>
                            </Link>
                            <div className="category-grid">
                                {performers.length > 0 ? (
                                    performers.slice(0, 9).map(sResult => (
                                        <PerformerCard 
                                            key={sResult.TypeData.id} 
                                            performer={sResult.TypeData as GQL.PerformerDataFragment} 
                                        />
                                    ))
                                ) : (
                                    <div className="no-results">No results found...</div>
                                )}
                            </div>
                        </div>

                        {/* Galleries Section */}
                        <div className="galleries-category category">
                            <Link to="/galleries" className="category-link">
                                <h5>Galleries</h5>
                            </Link>
                            <div className="category-grid">
                                {galleries.length > 0 ? (
                                    galleries.slice(0, 9).map(sResult => (
                                        <GalleryCard 
                                            key={sResult.TypeData.id} 
                                            gallery={sResult.TypeData as GQL.SlimGalleryDataFragment} 
                                        />
                                    ))
                                ) : (
                                    <div className="no-results">No results found...</div>
                                )}
                            </div>
                        </div>

                        {/* Scenes Section */}
                        <div className="scenes-category category">
                            <Link to="/scenes" className="category-link">
                                <h5>Scenes</h5>
                            </Link>
                            <div className="category-grid">
                                {scenes.length > 0 ? (
                                    scenes.slice(0, 9).map(sResult => (
                                        <SceneCard 
                                            key={sResult.TypeData.id} 
                                            scene={sResult.TypeData as GQL.SlimSceneDataFragment} 
                                        />
                                    ))
                                ) : (
                                    <div className="no-results">No results found...</div>
                                )}
                            </div>
                        </div>

                        {/* Studios Section */}
                        <div className="studios-category category">
                            <Link to="/studios" className="category-link">
                                <h5>Studios</h5>
                            </Link>
                            <div className="category-grid">
                                {studios.length > 0 ? (
                                    studios.slice(0, 9).map(sResult => (
                                        <StudioCard 
                                            key={sResult.TypeData.id} 
                                            studio={sResult.TypeData as GQL.StudioDataFragment} 
                                        />
                                    ))
                                ) : (
                                    <div className="no-results">No results found...</div>
                                )}
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="tags-category category">
                            <Link to="/tags" className="category-link">
                                <h5>Tags</h5>
                            </Link>
                            <div className="category-grid">
                                {tags.length > 0 ? (
                                    tags.slice(0, 9).map(sResult => (
                                        <TagCard 
                                            key={sResult.TypeData.id} 
                                            tag={sResult.TypeData as GQL.TagDataFragment}
                                            zoomIndex={4} 
                                        />
                                    ))
                                ) : (
                                    <div className="no-results">No results found...</div>
                                )}
                            </div>
                        </div>

                        {/* Movies Section */}
                        <div className="movies-category category">
                            <Link to="/groups" className="category-link">
                                <h5>Movies</h5>
                            </Link>
                            <div className="category-grid">
                                {movies.length > 0 ? (
                                    movies.slice(0, 9).map(sResult => (
                                        <GroupCard 
                                            key={sResult.TypeData.id} 
                                            group={sResult.TypeData as GQL.GroupDataFragment} 
                                        />
                                    ))
                                ) : (
                                    <div className="no-results">No results found...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
