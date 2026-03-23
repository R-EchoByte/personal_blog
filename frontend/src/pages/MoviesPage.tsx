import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "./MoviesPage.css";

type MovieCategory = "全部" | "电视剧" | "综艺" | "电影" | "动漫";
type SideMenu = "首页" | "电视剧" | "综艺" | "电影" | "动漫";

type MovieCard = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  people: string[];
  updateText: string;
  badge: string;
  heatText: string;
  rating: number;
  category: MovieCategory;
  cover: string;
  episodes: number;
};

const CATEGORY_TABS: MovieCategory[] = [
  "全部",
  "电视剧",
  "综艺",
  "电影",
  "动漫",
];

const SIDE_MENUS: SideMenu[] = ["首页", "电视剧", "电影", "综艺", "动漫"];

const MOVIES: MovieCard[] = [
  {
    id: "scan",
    title: "扫恶·首播",
    subtitle: "电影热搜榜第1名",
    description: "罪案高能，节奏紧凑。",
    people: ["张译", "王千源", "陈雨锶"],
    updateText: "更新至14集",
    badge: "上新",
    heatText: "实时热度 28万",
    rating: 9.1,
    category: "电影",
    cover: "/bj1.png",
    episodes: 14,
  },
  {
    id: "night-runner",
    title: "一人之下·此人朝南极高",
    subtitle: "没有不可爱的义务",
    description: "动作奇幻，镜头凌厉。",
    people: ["夏侯落枫", "彭尧", "小连杀"],
    updateText: "更新至13集",
    badge: "限免中",
    heatText: "追更人数 12万",
    rating: 8.8,
    category: "动漫",
    cover: "/bj2.png",
    episodes: 13,
  },
  {
    id: "flame",
    title: "她的盛焰",
    subtitle: "都市悬疑",
    description: "双女主线，反转密集。",
    people: ["热依扎", "李一桐", "陈都灵"],
    updateText: "更新至17集",
    badge: "限免中",
    heatText: "实时热度 22万",
    rating: 8.9,
    category: "电视剧",
    cover: "/bj3.png",
    episodes: 17,
  },
  {
    id: "minecraft",
    title: "海龟兄妹2·校弹来袭",
    subtitle: "地下泳池造避难所！",
    description: "创意冒险，节奏轻快。",
    people: ["海龟兄妹", "校弹", "方块工坊"],
    updateText: "更新至191集",
    badge: "独播",
    heatText: "播放量破千万",
    rating: 8.5,
    category: "综艺",
    cover: "/bj5.png",
    episodes: 191,
  },
  {
    id: "battle",
    title: "斗破苍穹·斗圣萧炎",
    subtitle: "犯我星陨者，杀无赦",
    description: "爽感战斗，特效拉满。",
    people: ["萧炎", "药老", "美杜莎"],
    updateText: "更新至191集",
    badge: "限免中",
    heatText: "榜单TOP 3",
    rating: 9.0,
    category: "动漫",
    cover: "/bj1.png",
    episodes: 191,
  },
  {
    id: "youth",
    title: "纯真年代·越品越好嗑",
    subtitle: "黄昏为刃，秘密为甲",
    description: "青春群像，情绪细腻。",
    people: ["张凌赫", "赵今麦", "章若楠"],
    updateText: "全29集",
    badge: "限免中",
    heatText: "新剧榜第2",
    rating: 8.7,
    category: "电视剧",
    cover: "/bj2.png",
    episodes: 29,
  },
  {
    id: "race",
    title: "极速赛点",
    subtitle: "巅峰车手同场竞技",
    description: "赛事现场，热血拉满。",
    people: ["维斯塔潘", "勒克莱尔", "诺里斯"],
    updateText: "更新至4集",
    badge: "直播回看",
    heatText: "体育专区",
    rating: 8.3,
    category: "综艺",
    cover: "/bj5.png",
    episodes: 4,
  },
];

function formatEpisode(index: number): string {
  return `第${index + 1}集`;
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function MoviesPage() {
  const [activeCategory, setActiveCategory] = useState<MovieCategory>("全部");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeMovieId, setActiveMovieId] = useState<string>(
    MOVIES[0]?.id ?? "",
  );
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const normalizedSearchKeyword = useMemo(
    () => normalizeSearchText(searchKeyword),
    [searchKeyword],
  );

  const filteredMovies = useMemo(
    () =>
      MOVIES.filter((movie) => {
        const categoryMatched =
          activeCategory === "全部" || movie.category === activeCategory;
        if (!categoryMatched) return false;

        if (!normalizedSearchKeyword) return true;

        const searchableText = normalizeSearchText(
          `${movie.title} ${movie.subtitle} ${movie.description} ${movie.people.join(" ")}`,
        );
        return searchableText.includes(normalizedSearchKeyword);
      }),
    [activeCategory, normalizedSearchKeyword],
  );

  useEffect(() => {
    if (filteredMovies.length === 0) {
      setActiveMovieId("");
      return;
    }
    if (!filteredMovies.some((movie) => movie.id === activeMovieId)) {
      setActiveMovieId(filteredMovies[0].id);
    }
  }, [activeMovieId, filteredMovies]);

  const activeMovie = useMemo(
    () => filteredMovies.find((movie) => movie.id === activeMovieId) ?? null,
    [activeMovieId, filteredMovies],
  );

  const activeEpisodes = useMemo(() => {
    if (!activeMovie) return [];
    const count = Math.min(activeMovie.episodes, 12);
    return Array.from({ length: count }, (_, index) => formatEpisode(index));
  }, [activeMovie]);

  useEffect(() => {
    setActiveEpisodeIndex(0);
  }, [activeMovieId]);

  const activeSideMenu = useMemo<SideMenu>(
    () => (activeCategory === "全部" ? "首页" : activeCategory),
    [activeCategory],
  );

  const handleSideMenuClick = (menu: SideMenu) => {
    setActiveCategory(menu === "首页" ? "全部" : menu);
  };

  return (
    <section className="moviehub-page">
      <aside className="moviehub-sidebar">
        <div className="moviehub-logo">影域</div>
        <nav className="moviehub-side-nav" aria-label="影视导航">
          {SIDE_MENUS.map((item) => (
            <button
              key={item}
              type="button"
              className={
                item === activeSideMenu
                  ? "moviehub-side-item is-active"
                  : "moviehub-side-item"
              }
              onClick={() => handleSideMenuClick(item)}
            >
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <Link className="moviehub-back-home" to="/">
          返回首页
        </Link>
      </aside>

      <main className="moviehub-main">
        <header className="moviehub-topbar">
          <h1 className="moviehub-top-title">影视网</h1>
          <div className="moviehub-search-panel">
            <div className="moviehub-search-wrap">
              <input
                className="moviehub-search"
                type="text"
                placeholder="搜索影视名 / 演员 / 导演"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
              {searchKeyword ? (
                <button
                  type="button"
                  className="moviehub-search-clear"
                  onClick={() => setSearchKeyword("")}
                >
                  清空
                </button>
              ) : null}
            </div>
            <p className="moviehub-search-result">
              当前结果：{filteredMovies.length} 部
            </p>
          </div>
        </header>

        <section className="moviehub-channel">
          <h1>重磅热播</h1>
          <div className="moviehub-categories">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={
                  tab === activeCategory
                    ? "moviehub-category is-active"
                    : "moviehub-category"
                }
                onClick={() => setActiveCategory(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {activeMovie ? (
          <section
            className="moviehub-player-strip"
            style={{ backgroundImage: `url("${activeMovie.cover}")` }}
          >
            <div className="moviehub-player-mask">
              <p className="moviehub-player-meta">
                正在播放 · {activeMovie.category}
              </p>
              <h2>{activeMovie.title}</h2>
              <p className="moviehub-player-desc">{activeMovie.description}</p>
              <p className="moviehub-player-people">
                人员：{activeMovie.people.join(" / ")}
              </p>
              <div className="moviehub-player-actions">
                <button type="button" className="moviehub-play-btn">
                  ▶ 立即播放
                </button>
                <span>{activeMovie.updateText}</span>
              </div>
              <div className="moviehub-episode-row">
                {activeEpisodes.map((episode, index) => (
                  <button
                    key={episode}
                    type="button"
                    className={
                      index === activeEpisodeIndex
                        ? "moviehub-episode is-active"
                        : "moviehub-episode"
                    }
                    onClick={() => setActiveEpisodeIndex(index)}
                  >
                    {episode}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="moviehub-grid" aria-label="影视卡片列表">
          {filteredMovies.map((movie) => (
            <button
              key={movie.id}
              type="button"
              className={
                movie.id === activeMovieId
                  ? "moviehub-card is-active"
                  : "moviehub-card"
              }
              onClick={() => setActiveMovieId(movie.id)}
            >
              <span className="moviehub-card-cover-wrap">
                <img src={movie.cover} alt={movie.title} loading="lazy" />
                <span className="moviehub-badge">{movie.badge}</span>
                <span className="moviehub-update">{movie.updateText}</span>
                <span className="moviehub-score">
                  {movie.rating.toFixed(1)}
                </span>
              </span>
              <span className="moviehub-card-title">{movie.title}</span>
              <span className="moviehub-card-subtitle">
                {movie.description}
              </span>
              <span className="moviehub-card-heat">{movie.heatText}</span>
            </button>
          ))}
        </section>
      </main>
    </section>
  );
}
