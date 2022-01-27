import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';
import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  image: string;
  description: string;
  href?: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Steam',
    image: '/img/icon_steam.svg',
    description: '只要好玩就玩🎮\n黄油仓库(不是)',
    href: 'http://steamcommunity.com/profiles/76561198239304782/'
  },
  {
    title: 'bilibili',
    image: '/img/icon_bilibili.svg',
    description: '随缘直播🕹️',
    href: 'https://space.bilibili.com/11171730/',
  },
  {
    title: 'GitHub',
    image: '/img/icon_github.svg',
    description: 'BUG 存储仓库🤣\n我真的学不动了.jpg',
    href: 'https://github.com/NoraH1to/',
  },
];

function Feature({ title, image, description, href }: FeatureItem) {
  return (
    <div className={clsx('col col--4 text--center')}>
      <div
        className={clsx(
          'text--break card shadow--md avatar avatar--vertical padding--lg',
          styles.feature
        )}
      >
        <img
          className={clsx('avatar__photo avatar__photo--xl', styles.featureSvg)}
          alt={title}
          src={image}
        />
        <div className='avatar__intro'>
          <a className='avatar__name' href={href}>{title}</a>
          <h5 className='avatar__subtitle'>{description}</h5>
          {/* <a className='avatar__subtitle' href={href} target="_blank">
            前往
          </a> */}
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className='container'>
        <div className='row'>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
