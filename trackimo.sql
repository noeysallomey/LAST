CREATE DATABASE trackimo;

\c trackimo

CREATE TYPE email_status AS ENUM (
	'Opened', 
	'Bounced', 
	'Clicked', 
	'DNO', 
	'Unsubscribed', 
	'Complained'
	);

CREATE TYPE role_type AS ENUM (
    'Admin',
    'Staff',
    'Checker'
);

CREATE TYPE sched_status AS ENUM (
    'Ongoing',
    'Done',
    'Upcoming'
);

CREATE TABLE users (
user_id            serial        PRIMARY KEY NOT NULL,
first_name         text        NOT NULL,
middle_init        character(1),
last_name          text        NOT NULL,
username           text        UNIQUE NOT NULL,
password           text        NOT NULL,
role               role_type
);

CREATE TABLE category(
category_id 	     serial 		 PRIMARY KEY NOT NULL,
category_name 	   text        UNIQUE NOT NULL
);

CREATE TABLE niche(
category_id		    integer		   NOT NULL REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
niche_id		      serial		   PRIMARY KEY NOT NULL,
niche_name		    text         UNIQUE NOT NULL
);

CREATE TABLE email_users(
email_id 		     serial		     UNIQUE PRIMARY KEY NOT NULL,
email_address	   text,
category_id 	   integer		   NOT NULL REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
niche_id		     integer		   NOT NULL REFERENCES niche (niche_id) ON DELETE CASCADE ON UPDATE CASCADE,
company 		     text,
contact_person	 text,
website			     text          NOT NULL,
phone_number	   text,
address 		     text,
timezone		     text,
date_added       date          NOT NULL, 
staff_assigned   text          NOT NULL REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE,
contact_url		   text
);

CREATE TABLE activity(
email_id		    integer		     PRIMARY KEY NOT NULL REFERENCES email_users (email_id) ON DELETE CASCADE ON UPDATE CASCADE,
category_id 	  integer		     NOT NULL REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
niche_id 		    integer		     NOT NULL REFERENCES niche (niche_id) ON DELETE CASCADE ON UPDATE CASCADE,
email_status	  email_status   NOT NULL,
campaign_date	  date 		       NOT NULL
);

CREATE TABLE schedule (
id 				      integer 		   PRIMARY KEY NOT NULL,
title 			    text 			     NOT NULL,
start 			    date 			     NOT NULL,
"end" 			    date 			     NOT NULL,
event_status 	  sched_status 	 DEFAULT 'Upcoming'::sched_status,
CONSTRAINT      validenddate   CHECK ((("end" >= ('now'::text)::date) AND ("end" >= start))),
CONSTRAINT      validstartdate CHECK ((start >= ('now'::text)::date))
);

CREATE TABLE advertisers(
id              serial         PRIMARY KEY NOT NULL,
company_name    text,
website         text           NOT NULL,
social_media    text,
email_address   text           NOT NULL,
remarks         varchar(1000),
phone_number    text,
contact_person  text
);

CREATE VIEW category_view AS
select category_name, count(niche_name) as count, (SELECT count(email_id) as emails from category LEFT JOIN email_users ON email_users.category_id = category.category_id) FROM category LEFT JOIN niche ON niche.category_id = category.category_id GROUP BY category.category_name ORDER BY category_name;
      
CREATE VIEW report AS 
  SELECT  email_users.email_id, 
          email_users.email_address, 
          ( SELECT SUBSTRING(website FROM 'http://([^/]*).*') as domain),
          category.category_name, niche.niche_name, 
          email_status, 
          (SELECT age(activity.campaign_date) AS days) AS days 
  FROM email_users, activity, category, niche 
  WHERE activity.email_id=email_users.email_id AND 
        email_users.category_id = category.category_id AND 
        niche.niche_id=activity.niche_id;

CREATE VIEW sched_simple AS
  SELECT  schedule.id,
          schedule.start,
          ( SELECT date_part('year' ::text, schedule.start) AS start_year)  AS start_year,
          ( SELECT date_part('month'::text, schedule.start) AS start_month) AS start_month,
          ( SELECT date_part('day'  ::text, schedule.start) AS start_day)   AS start_day,
          ( SELECT date_part('year' ::text, schedule."end") AS end_year)    AS end_year,
          ( SELECT date_part('month'::text, schedule."end") AS end_month)   AS end_month,
          ( SELECT date_part('day'  ::text, schedule."end") AS end_day)     AS end_day
  FROM schedule;

CREATE EXTENSION pgcrypto;

CREATE OR REPLACE FUNCTION insert_update_username()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM users
           WHERE (username)
           = (NEW.username)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_username
BEFORE INSERT OR UPDATE OF username 
ON users
FOR EACH ROW EXECUTE PROCEDURE insert_update_username();


CREATE OR REPLACE FUNCTION insert_update_category()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM category
           WHERE (category_name)
           = (NEW.category_name)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_category
BEFORE INSERT OR UPDATE OF category_name 
ON category
FOR EACH ROW EXECUTE PROCEDURE insert_update_category();


CREATE OR REPLACE FUNCTION insert_update_niche()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM niche
           WHERE (niche_name)
           = (NEW.niche_name)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_niche
BEFORE INSERT OR UPDATE OF niche_name 
ON niche
FOR EACH ROW EXECUTE PROCEDURE insert_update_niche();


CREATE OR REPLACE FUNCTION insert_update_email()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM email_users
           WHERE (email_address)
           = (NEW.email_address) AND NEW.email_address != 'NULL') THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_email
BEFORE INSERT OR UPDATE OF email_address 
ON email_users
FOR EACH ROW EXECUTE PROCEDURE insert_update_email();

CREATE OR REPLACE FUNCTION insert_update_advertisers()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM advertisers
           WHERE (email_address)
           = (NEW.email_address)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_advertisers
BEFORE INSERT OR UPDATE OF email_address 
ON advertisers
FOR EACH ROW EXECUTE PROCEDURE insert_update_advertisers();


CREATE FUNCTION auto_ins_email_status() 
RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   INSERT INTO activity VALUES (NEW.email_id, NEW.category_id, NEW.niche_id, 'DNO', CURRENT_DATE);
   return NEW;
END
$$;

CREATE TRIGGER before_insert_activity
AFTER INSERT
ON email_users
FOR EACH ROW EXECUTE PROCEDURE auto_ins_email_status() ;

CREATE FUNCTION valid_start() 
RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
IF NEW.start <= CURRENT_DATE

THEN
RAISE EXCEPTION 'Start date should be at least tomorrow.';
RETURN NULL;
END IF;
RETURN NEW;
 END
$$;

CREATE FUNCTION valid_end() 
RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
IF NEW.start <= NEW.end

THEN
RAISE EXCEPTION 'End date should be after start date.';
RETURN NULL;
END IF;
RETURN NEW;
 END
$$;

CREATE FUNCTION update_sched() 
RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
EXECUTE 'UPDATE schedule SET event_status = ' || quote_literal('Ongoing') || ' WHERE event_status=' || quote_literal('Upcoming')  || ' AND now() >= schedule.start AND now() <= schedule.end';
EXECUTE 'UPDATE schedule SET event_status = ' || quote_literal('Done')    || ' WHERE event_status=' || quote_literal('Ongoing')   || ' AND now() > schedule.end';
END
$$;

CREATE OR REPLACE FUNCTION loaddataCategory(filepathname text)
  RETURNS void AS
$$
BEGIN

EXECUTE format ('
COPY category(
      category_name)
FROM %L
(FORMAT CSV, HEADER)', $1);

END
$$ LANGUAGE plpgsql;