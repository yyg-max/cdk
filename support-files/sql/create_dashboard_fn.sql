-- 仪表盘数据函数 (PostgreSQL)
CREATE OR REPLACE FUNCTION get_dashboard_data(p_days INTEGER, p_limit_count INTEGER)
RETURNS TABLE (
    "userGrowth" JSON,
    "activityData" JSON,
    "projectTags" JSON,
    "distributeModes" JSON,
    "hotProjects" JSON,
    "activeCreators" JSON,
    "activeReceivers" JSON,
    "summary" JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (
            SELECT json_agg(
                       json_build_object(
                           'date', to_char(date_col, 'MM"月"DD"日"'),
                           'value', count_val
                       )
                   )
            FROM (
                     SELECT DATE(created_at) AS date_col, COUNT(*) AS count_val
                     FROM users
                     WHERE created_at >= CURRENT_DATE - (p_days || ' days')::interval
                     GROUP BY DATE(created_at)
                     ORDER BY date_col DESC
                 ) AS tmp_user_growth
        ) AS userGrowth,
        (
            SELECT json_agg(
                       json_build_object(
                           'date', to_char(date_col, 'MM"月"DD"日"'),
                           'value', count_val
                       )
                   )
            FROM (
                     SELECT DATE(received_at) AS date_col, COUNT(*) AS count_val
                     FROM project_items
                     WHERE received_at >= CURRENT_DATE - (p_days || ' days')::interval
                     GROUP BY DATE(received_at)
                     ORDER BY date_col DESC
                 ) AS tmp_activity
        ) AS activityData,
        (
            SELECT json_agg(
                       json_build_object('name', tag, 'value', tag_count)
                   )
            FROM (
                     SELECT pt.tag, COUNT(*) AS tag_count
                     FROM project_tags pt
                     INNER JOIN projects p ON pt.project_id = p.id
                     WHERE p.status = 0
                     GROUP BY pt.tag
                 ) AS tag_stats
        ) AS projectTags,
        (
            SELECT json_agg(
                       json_build_object('name', distribution_type, 'value', dist_count)
                   )
            FROM (
                     SELECT distribution_type, COUNT(*) AS dist_count
                     FROM projects
                     WHERE status = 0
                     GROUP BY distribution_type
                 ) AS dist_stats
        ) AS distributeModes,
        (
            SELECT
                json_agg(json_build_object('name', name, 'tags', tags, 'receiveCount', receive_count))
            FROM
                (
                    SELECT p.name, pt.tags, pi.receive_count
                    FROM projects p
                    JOIN (
                        SELECT project_id, COUNT(*) AS receive_count
                        FROM project_items
                        WHERE receiver_id IS NOT NULL
                        GROUP BY project_id
                    ) pi ON pi.project_id = p.id
                    LEFT JOIN (
                        SELECT project_id, json_agg(tag) AS tags
                        FROM project_tags
                        GROUP BY project_id
                    ) pt ON pt.project_id = p.id
                    WHERE p.status = 0
                    ORDER BY pi.receive_count DESC
                    LIMIT p_limit_count
                ) AS hot_stats
        ) AS hotProjects,
        (
            SELECT json_agg(
                       json_build_object('avatar', avatar_url, 'nickname', nickname, 'username', username, 'projectCount', project_count)
                   )
            FROM (
                     SELECT u.avatar_url, u.nickname, u.username, COUNT(p.id) AS project_count
                     FROM projects p
                              JOIN users u ON u.id = p.creator_id AND p.status = 0
                     GROUP BY u.id, u.avatar_url, u.username
                     ORDER BY project_count DESC
                     LIMIT p_limit_count
                 ) AS creator_stats
        ) AS activeCreators,
        (
            SELECT json_agg(
                       json_build_object('avatar', avatar_url, 'nickname', nickname, 'username', username, 'receiveCount', receive_count)
                   )
            FROM (
                     SELECT u.avatar_url, u.nickname, u.username, COUNT(pi.id) AS receive_count
                     FROM project_items pi
                              JOIN users u ON u.id = pi.receiver_id
                     WHERE pi.receiver_id IS NOT NULL
                     GROUP BY u.id, u.avatar_url, u.username
                     ORDER BY receive_count DESC
                     LIMIT p_limit_count
                 ) AS receiver_stats
        ) AS activeReceivers,
        (
            SELECT json_build_object(
                       'totalUsers', (SELECT COUNT(*) FROM users),
                       'newUsers', (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - (p_days || ' days')::interval),
                       'totalProjects', (SELECT COUNT(*) FROM projects WHERE status = 0),
                       'totalReceived', (SELECT COUNT(*) FROM project_items WHERE received_at IS NOT NULL),
                       'recentReceived', (SELECT COUNT(*) FROM project_items WHERE received_at >= CURRENT_DATE - (p_days || ' days')::interval)
                   )
        ) AS summary;
END;
$$ LANGUAGE plpgsql;
